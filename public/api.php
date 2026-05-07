<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$source = $_GET['source'] ?? '';
$path = $_GET['path'] ?? '';

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

// Convert path to a safe filename
$safePath = str_replace(['/', '\\'], '_', $path);
$cacheFile = $cacheDir . '/' . $safePath;
$cacheTTL = 60 * 30; // 30 minutes

// Check cache - allow bypass with ?flush=1
$flush = isset($_GET['flush']) && $_GET['flush'] == '1';
if (!$flush && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
    echo file_get_contents($cacheFile);
    exit;
}

$data = null;
$lastError = "";

// Determine fetch URL
if ($source === 'f1') {
    // Attempt native Jolpica transformations
    if (preg_match('/^races\/(\d{4})\/driverStandings\.json$/', $path, $matches)) {
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
    else if (preg_match('/^races\/(\d{4})\/constructorStandings\.json$/', $path, $matches)) {
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
        $baseUrls = [
            'https://raw.githubusercontent.com/MatthewDelong/f1nsight-api-2/master/' => 5,
        ];
        foreach ($baseUrls as $baseUrl => $timeout) {
            $data = fetchUrl($baseUrl . $path, $timeout, $lastError);
            if ($data) break;
        }
    }

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
if ($data) {
    file_put_contents($cacheFile, $data);
    echo $data;
} else {
    // If fetch failed completely, output stale cache if it exists
    if (file_exists($cacheFile)) {
        echo file_get_contents($cacheFile);
    } else {
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to fetch data and no stale cache available',
            'path' => $path,
            'curl_error' => $lastError
        ]);
    }
}
