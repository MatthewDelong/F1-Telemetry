<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://f1-telemetry.co.uk');
header('Access-Control-Allow-Methods: GET');
header('X-API-Version: 2.1');

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

$source = $_GET['source'] ?? '';
$path = $_GET['path'] ?? '';

// Validate source against allowed values
if (!in_array($source, ['f1', 'f2', 'f1a', 'openf1'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid source parameter']);
    exit;
}

// Prevent path traversal attacks
if (preg_match('/\.\.[\/\\\\]/', $path) || preg_match('/[;\|`\$]/', $path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid path parameter']);
    exit;
}

// Robust path reconstruction for OpenF1
// If the path contains its own query parameters, PHP might have split them into separate $_GET entries.
// We need to rejoin them to ensure they reach the target API.
if ($source === 'openf1' && strpos($_SERVER['QUERY_STRING'], '&') !== false) {
    $queryString = $_SERVER['QUERY_STRING'];
    // Find the 'path=' part and take everything after it
    $pos = strpos($queryString, 'path=');
    if ($pos !== false) {
        $fullPath = substr($queryString, $pos + 5);
        // Clean up common api.php params from the tail if they exist (rare in OpenF1 calls)
        $fullPath = preg_replace('/&source=[^&]*/', '', $fullPath);
        $fullPath = preg_replace('/&flush=[^&]*/', '', $fullPath);
        $fullPath = preg_replace('/&refresh=[^&]*/', '', $fullPath);
        $path = urldecode($fullPath);
    }
}

if (empty($source) || empty($path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Mission parameters: source and/or path']);
    exit;
}

// Function to fetch OpenF1 auth token
function getOpenF1Token() {
    $envFile = __DIR__ . '/../.env.production';
    $username = '';
    $password = '';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                if ($name === 'OPENF1_USERNAME') $username = $value;
                if ($name === 'OPENF1_PASSWORD') $password = $value;
            }
        }
    }
    if (empty($username) || empty($password)) {
        return null;
    }
    
    $tokenCacheDir = __DIR__ . '/api_cache/auth';
    if (!is_dir($tokenCacheDir)) {
        @mkdir($tokenCacheDir, 0755, true);
    }
    $tokenCacheFile = $tokenCacheDir . '/openf1_token.json';
    
    if (file_exists($tokenCacheFile)) {
        $cached = json_decode(file_get_contents($tokenCacheFile), true);
        if ($cached && isset($cached['access_token']) && time() < $cached['expires_at']) {
            return $cached['access_token'];
        }
    }
    
    // Fetch new token
    $ch = curl_init('https://api.openf1.org/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'username' => $username,
        'password' => $password
    ]));
    $res = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpcode == 200 && $res) {
        $data = json_decode($res, true);
        if (isset($data['access_token'])) {
            $data['expires_at'] = time() + (isset($data['expires_in']) ? $data['expires_in'] : 3600) - 60;
            @file_put_contents($tokenCacheFile, json_encode($data));
            return $data['access_token'];
        }
    }
    return null;
}

// Function to fetch data via cURL with file_get_contents fallback
function fetchUrl($url, $timeout = 10, &$errorMsg = null, $headers = []) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $curlHeaders = [];
    // Use a standard browser User-Agent
    $curlHeaders[] = 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    foreach ($headers as $k => $v) {
        $curlHeaders[] = "$k: $v";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
    
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errorMsg = curl_error($ch);
    
    if ($httpcode == 200 && $response) {
        return $response;
    }

    // Fallback to file_get_contents if cURL failed
    if (ini_get('allow_url_fopen')) {
        $options = [
            "http" => [
                "method" => "GET",
                "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n",
                "timeout" => $timeout
            ],
            "ssl" => [
                "verify_peer" => true,
                "verify_peer_name" => true,
            ]
        ];
        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);
        if ($response !== false) {
            return $response;
        }
    }

    return false;
}

$cacheDir = __DIR__ . '/api_cache/' . $source;
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

// Convert path to a safe filename for caching. 
// We use MD5 of the full path to ensure different query parameters get different cache files.
$cacheKey = md5($path);
$cacheFile = $cacheDir . '/' . $cacheKey . '.json';
$cacheTTL = 60 * 30; // 30 minutes

// Check cache - allow bypass with ?flush=1 or ?refresh=true
$flush = (isset($_GET['flush']) && $_GET['flush'] == '1') || 
         (isset($_GET['refresh']) && $_GET['refresh'] == 'true') ||
         (strpos($path, 'refresh=true') !== false); // Safety catch

if ($flush) {
    if (file_exists($cacheFile)) {
        @unlink($cacheFile); // Delete old cache to be safe
    }
} else if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
    echo file_get_contents($cacheFile);
    exit;
}

// For F1 source logic only, we might need a version of the path without query strings
$pathWithoutQuery = explode('?', $path)[0];
$pathWithoutQuery = explode('&', $pathWithoutQuery)[0];

$data = null;
$lastError = "";

// Determine fetch URL
if ($source === 'f1') {
    // 1. Try local file on server first (for "uploaded new build" workflow)
    // Restrict to JSON files within the expected directory to prevent path traversal
    $localPath = __DIR__ . '/' . $pathWithoutQuery;
    $realLocal = realpath($localPath);
    $realBase = realpath(__DIR__);
    if (!$flush && $realLocal && $realBase && strpos($realLocal, $realBase) === 0 
        && preg_match('/\.json$/', $realLocal) && file_exists($realLocal)) {
        $data = file_get_contents($realLocal);
    }

    // 2. Try GitHub fallbacks
    if (!$data) {

        // 2. Try GitHub fallbacks
        if (!$data) {
            $baseUrls = [
                'https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/f1/' => 10,
                'https://raw.githubusercontent.com/MatthewDelong/f1-telemetry-api/main/' => 5,
            ];
            foreach ($baseUrls as $baseUrl => $timeout) {
                // Try up to 3 path variations for maximum resilience
                $pathVariations = [$path];
                
                // 1. Try stripping 'races/' prefix for historical repos that might be flat
                if (preg_match('/^races\/(\d{4})\/(.*\.json)$/', $path, $m)) {
                    $year = $m[1];
                    $file = $m[2];
                    $pathVariations[] = "{$year}/{$file}";
                }
                // 2. Map global files like 'races/races.json' -> 'races.json'
                else if ($path === 'races/races.json') {
                    $pathVariations[] = 'races.json';
                }
                else if ($path === 'races/raceDetails.json') {
                    $pathVariations[] = 'raceDetails.json';
                }

                foreach ($pathVariations as $fetchPath) {
                    $data = fetchUrl($baseUrl . $fetchPath, $timeout, $lastError);
                    if ($data && strlen($data) > 10) break;
                }
                if ($data && strlen($data) > 10) break;
            }
        }
    }

} else if ($source === 'openf1') {
    // Proxy for OpenF1 API using the custom Cloudflare Worker to bypass live session blocks
    $baseUrl = "https://openf1-proxy.matthew-delong73.workers.dev/";
    // Strip leading slash if present in path
    $requestPath = ltrim($path, '/');
    
    $headers = [
        'Origin' => 'https://f1-telemetry.co.uk' // Spoof origin to satisfy worker restrictions
    ];
    
    $data = fetchUrl($baseUrl . $requestPath, 15, $lastError, $headers);
} else if ($source === 'f1a' || $source === 'f2') {
    $urlsToTry = [];
    $basePath = ($source === 'f1a') ? 'f1a' : 'f2';
    $legacyApi = ($source === 'f1a') ? 'f1aapi' : 'f2api';

    // Try original path and a flattened path (like local server.js does)
    $pathsToTry = [$path];
    if (basename($path) !== $path) {
        $pathsToTry[] = basename($path);
    }

    // Try the new F1-Telemetry repo first for all path variations
    foreach ($pathsToTry as $p) {
        $urlsToTry['https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/' . $basePath . '/' . $p] = 10;
    }
    // Fallback to legacy APIs if not found in the new repo
    foreach ($pathsToTry as $p) {
        $urlsToTry['https://raw.githubusercontent.com/MatthewDelong/' . $legacyApi . '/main/' . $p] = 5;
    }

    foreach ($urlsToTry as $url => $timeout) {
        // Try original path
        $data = fetchUrl($url, $timeout, $lastError);
        if ($data) break;

        // Try typo path if applicable
        if (strpos($url, 'results.json') !== false) {
            $typoUrl = str_replace('results.json', 'resullts.json', $url);
            $data = fetchUrl($typoUrl, $timeout, $lastError);
            if ($data) break;
        }
    }
}

// Serve Data
if ($data && strlen($data) >= 2) { // Allow [] which is a valid but empty response
    file_put_contents($cacheFile, $data);
    echo $data;
} else {
    // If fetch failed completely, output stale cache if it exists
    if (file_exists($cacheFile)) {
        echo file_get_contents($cacheFile);
    } else {
        http_response_code(404);
        echo json_encode([
            'error' => 'Failed to fetch data and no stale cache available'
        ]);
    }
}
