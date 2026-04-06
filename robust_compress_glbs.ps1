# Use the more robust gltf-transform to optimize the remaining large files
$glbFiles = Get-ChildItem -Path "public/ArFiles/glbs" -Filter *.glb -Recurse

# Specifically target the ones still over 20MB
$toOptimize = $glbFiles | Where-Object { $_.Length -gt 20MB }

Write-Host "Found $($toOptimize.Count) high-fidelity models that need robust optimization..." -ForegroundColor Cyan

foreach ($file in $toOptimize) {
    $sizeMB = [math]::Round($file.Length / 1MB, 2)
    Write-Host "Optimizing ($sizeMB MB): $($file.FullName)..." -ForegroundColor Yellow
    
    # Use gltf-transform optimize (more resilient than gltf-pipeline)
    # We create a temp file and then overwrite to avoid access issues
    $tempFile = "$($file.FullName)_tmp.glb"
    npx -y @gltf-transform/cli optimize "$($file.FullName)" "$tempFile" --verbose
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path "$tempFile")) {
        Move-Item -Path "$tempFile" -Destination "$($file.FullName)" -Force
        Write-Host "Success: $($file.Name) is now optimized!" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to optimize $($file.Name)" -ForegroundColor Red
        if (Test-Path "$tempFile") { Remove-Item "$tempFile" }
    }
}

Write-Host "Final collection optimized. Your AR Viewer will now be lightning fast on IONOS!" -ForegroundColor Green
