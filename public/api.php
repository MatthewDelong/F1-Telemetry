<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Simple proxy and cache script for IONOS Web Hosting Plus.
// Requirements: Handles f1, f1a, f2 sources. Re-structures Jolpica data for F1 where possible, relies on old GitHub repos as structural fallbacks.

$source = $_GET['source'] ?? '';
$path = $_GET['path'] ?? '';

if (empty($source) || empty($path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Mission parameters: source and/or path']);
    exit;
}

$cacheDir = __DIR__ . '/api_cache/' . $source;
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Convert path to a safe filename
$safePath = str_replace(['/', '\\'], '_', $path);
$cacheFile = $cacheDir . '/' . $safePath;
$cacheTTL = 3600 * 2; // 2 hours

// Function to fetch data via cURL
function fetchUrl($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    // Masquerade user agent
    curl_setopt($ch, CURLOPT_USERAGENT, 'F1nsight-Backend/1.0');
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpcode == 200 && $response) {
        return $response;
    }
    return false;
}

// Check cache
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
    echo file_get_contents($cacheFile);
    exit;
}

$data = null;

// Determine fetch URL
if ($source === 'f1') {
    // Attempt native Jolpica transformations
    if (preg_match('/^races\/(\d{4})\/driverStandings\.json$/', $path, $matches)) {
        $year = $matches[1];
        $raw = fetchUrl("https://api.jolpi.ca/ergast/f1/{$year}/driverStandings.json");
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
        $raw = fetchUrl("https://api.jolpi.ca/ergast/f1/{$year}/constructorStandings.json");
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
        $baseUrl = 'https://praneeth7781.github.io/f1nsight-api-2/';
        $data = fetchUrl($baseUrl . $path);
    }

} else if ($source === 'f1a') {
    $baseUrl = 'https://ant-dot-comm.github.io/f1aapi/';
    $data = fetchUrl($baseUrl . $path);
} else if ($source === 'f2') {
    $baseUrl = 'https://raw.githubusercontent.com/MatthewDelong/f2api/main/';
    $data = fetchUrl($baseUrl . $path);
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
        echo json_encode(['error' => 'Failed to fetch data and no stale cache available']);
    }
}
