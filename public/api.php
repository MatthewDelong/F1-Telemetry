<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$source = $_GET['source'] ?? '';
$path = $_GET['path'] ?? '';

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

// Function to fetch data via cURL with file_get_contents fallback
function fetchUrl($url, $timeout = 10, &$errorMsg = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    // Use a standard browser User-Agent
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
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
                "verify_peer" => false,
                "verify_peer_name" => false,
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
    // Attempt native Jolpica transformations
    if (preg_match('/^races\/(\d{4})\/driverStandings\.json$/', $pathWithoutQuery, $matches)) {
        $year = $matches[1];
        $raw = fetchUrl("https://api.jolpi.ca/ergast/f1/{$year}/driverStandings.json", 10, $lastError);
        if ($raw) {
            $parsed = json_decode($raw, true);
            $lists = $parsed['MRData']['StandingsTable']['StandingsLists'] ?? [];
            $output = [];
            foreach ($lists as $list) {
                $output[$list['round']] = $list['DriverStandings'];
                $output['latest'] = $list['DriverStandings'];
            }
            $data = json_encode($output);
        }
    } 
    else if (preg_match('/^races\/(\d{4})\/constructorStandings\.json$/', $pathWithoutQuery, $matches)) {
        $year = $matches[1];
        $raw = fetchUrl("https://api.jolpi.ca/ergast/f1/{$year}/constructorStandings.json", 10, $lastError);
        if ($raw) {
            $parsed = json_decode($raw, true);
            $lists = $parsed['MRData']['StandingsTable']['StandingsLists'] ?? [];
            $output = [];
            foreach ($lists as $list) {
                $output[$list['round']] = $list['ConstructorStandings'];
                $output['latest'] = $list['ConstructorStandings'];
            }
            $data = json_encode($output);
        }
    }

    // Fallback F1 Proxy if not matched or failed to fetch
    if (!$data) {
        // 1. Try local file on server first (for "uploaded new build" workflow)
        $localPath = __DIR__ . '/' . $pathWithoutQuery;
        if (file_exists($localPath)) {
            $data = file_get_contents($localPath);
        }

        // 2. Try GitHub fallbacks
        if (!$data) {
            $baseUrls = [
                'https://raw.githubusercontent.com/MatthewDelong/f1-telemetry-api/main/' => 10,
                'https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/f1/' => 5,
            ];
            foreach ($baseUrls as $baseUrl => $timeout) {
                // Try up to 3 path variations for maximum resilience
                $pathVariations = [$path];
                
                // 1. Try stripping 'races/' prefix for historical repos that might be flat
                if (preg_match('/^races\/(\d{4})\/(.*\.json)$/', $path, $m)) {
                    $year = $m[1];
                    $file = $m[2];
                    $pathVariations[] = "{$year}/{$file}";
                    
                    // Special mapping for main repository flat structure (2026)
                    if (strpos($baseUrl, 'F1-Telemetry') !== false && $year === '2026') {
                        $pathVariations = [$file]; // Priority for root file in 2026
                    }
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
    // Proxy for OpenF1 API to avoid 429 in frontend
    $baseUrl = "https://api.openf1.org/";
    // Strip leading slash if present in path
    $requestPath = ltrim($path, '/');
    $data = fetchUrl($baseUrl . $requestPath, 15, $lastError);
} else if ($source === 'f1a' || $source === 'f2') {
    $baseUrls = [];
    if ($source === 'f1a') {
        $baseUrls = [
            'https://raw.githubusercontent.com/MatthewDelong/f1aapi/main/' => 5,
        ];
    } else {
        $baseUrls = [
            'https://raw.githubusercontent.com/MatthewDelong/f2api/main/' => 5,
        ];
    }

    foreach ($baseUrls as $baseUrl => $timeout) {
        // Try original path
        $data = fetchUrl($baseUrl . $path, $timeout, $lastError);
        if ($data) break;

        // Try typo path if applicable
        if (strpos($path, 'results.json') !== false) {
            $typoPath = str_replace('results.json', 'resullts.json', $path);
            $data = fetchUrl($baseUrl . $typoPath, $timeout, $lastError);
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
            'error' => 'Failed to fetch data and no stale cache available',
            'path' => $path,
            'attempted_url' => isset($baseUrl) && isset($fetchPath) ? $baseUrl . $fetchPath : 'N/A',
            'curl_error' => $lastError
        ]);
    }
}
