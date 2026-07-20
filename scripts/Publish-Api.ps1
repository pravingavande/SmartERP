# Publish SmartEPR API only (for IIS / smarterp.pathsoft.in)
# Run: powershell -ExecutionPolicy Bypass -File scripts\Publish-Api.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$apiOut = Join-Path $root 'publish\SmartEPR-Api'
$apiProject = Join-Path $root 'backend\SmartEPR.Api\SmartEPR.Api.csproj'
$prodSettings = Join-Path $root 'backend\SmartEPR.Api\appsettings.Production.json'
$iisSettings = Join-Path $root 'backend\SmartEPR.Api\appsettings.IIS.json'
$deployNote = Join-Path $apiOut 'DEPLOY-NOTE.txt'

Write-Host 'Publishing SmartEPR API...' -ForegroundColor Cyan
Write-Host "Output: $apiOut"

if (Test-Path $apiOut) {
  Remove-Item $apiOut -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $apiOut -Force | Out-Null

dotnet publish $apiProject -c Release -o $apiOut --self-contained false
if ($LASTEXITCODE -ne 0) { throw 'API publish failed.' }

Copy-Item $prodSettings (Join-Path $apiOut 'appsettings.Production.json') -Force
Copy-Item $iisSettings (Join-Path $apiOut 'appsettings.IIS.json') -Force

# Ensure base appsettings CORS includes Firebase (IIS may run without Production env).
$baseSettings = Join-Path $apiOut 'appsettings.json'
if (Test-Path $baseSettings) {
  $json = Get-Content $baseSettings -Raw | ConvertFrom-Json
  $json.Cors = @{
    AllowedOrigins = @(
      'http://localhost:4200',
      'https://smartepr.web.app',
      'https://smartepr.firebaseapp.com',
      'https://smarterp.pathsoft.in',
      'http://smarterp.pathsoft.in'
    )
  }
  $json | ConvertTo-Json -Depth 8 | Set-Content $baseSettings -Encoding UTF8
}
$note = @"
SmartEPR API — IIS deployment
=============================

COPY TO VPS (IIS api application folder):
  $apiOut

appsettings.Production.json is included in this package (SQL + JWT + CORS).

After copy: restart IIS app pool, then test:
  https://smarterp.pathsoft.in/api/health  -> "database": true

Published: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@
Set-Content -Path $deployNote -Value $note -Encoding UTF8

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host "API folder: $apiOut"
Write-Host "Guide:      $deployNote"
