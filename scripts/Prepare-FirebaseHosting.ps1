# Merge School public website (static) + SmartERP Angular app (/app/)
# Optional — use only if hosting both on one Firebase site.
# For separate hosting: deploy school-sanstha-portal on school domain, SmartERP via frontend npm run deploy
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$hostingDist = Join-Path $root 'hosting-dist'
$portalSrc = Join-Path $root 'school-sanstha-portal'
$angularDist = Join-Path $root 'frontend\dist\frontend\browser'

if (-not (Test-Path $angularDist)) {
  throw "Angular build not found at $angularDist. Run: cd frontend; npm run build:prod"
}

if (-not (Test-Path $portalSrc)) {
  throw "Static portal folder not found at $portalSrc"
}

Write-Host 'Preparing Firebase hosting bundle...' -ForegroundColor Cyan

if (Test-Path $hostingDist) {
  Remove-Item $hostingDist -Recurse -Force
}
New-Item -ItemType Directory -Path $hostingDist | Out-Null

Copy-Item -Path (Join-Path $portalSrc '*') -Destination $hostingDist -Recurse -Force
Copy-Item -Path $angularDist -Destination (Join-Path $hostingDist 'app') -Recurse -Force

Write-Host "Hosting bundle ready: $hostingDist" -ForegroundColor Green
Write-Host '  /          -> School public website (school-sanstha-portal)'
Write-Host '  /app/      -> SmartERP Angular application'
