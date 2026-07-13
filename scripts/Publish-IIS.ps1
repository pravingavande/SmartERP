# Publish SmartEPR for IIS (API + Angular static site)
# Run: powershell -ExecutionPolicy Bypass -File scripts\Publish-IIS.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$publishRoot = Join-Path $root 'publish\IIS'
$apiOut = Join-Path $publishRoot 'SmartEPR-Api'
$webOut = Join-Path $publishRoot 'SmartEPR-Web'
$apiProject = Join-Path $root 'backend\SmartEPR.Api\SmartEPR.Api.csproj'
$prodSettings = Join-Path $root 'backend\SmartEPR.Api\appsettings.Production.json'
$iisSettings = Join-Path $root 'backend\SmartEPR.Api\appsettings.IIS.json'

Write-Host 'Publishing SmartEPR for IIS...' -ForegroundColor Cyan
Write-Host "Output folder: $publishRoot"

if (Test-Path $publishRoot) {
  Remove-Item $publishRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $apiOut, $webOut -Force | Out-Null

Write-Host ''
Write-Host '[1/2] Publishing API (.NET 9)...' -ForegroundColor Yellow
dotnet publish $apiProject -c Release -o $apiOut --self-contained false
if ($LASTEXITCODE -ne 0) { throw 'API publish failed.' }

Copy-Item $prodSettings (Join-Path $apiOut 'appsettings.Production.json') -Force
Copy-Item $iisSettings (Join-Path $apiOut 'appsettings.IIS.json') -Force

Write-Host ''
Write-Host '[2/2] Building Angular (IIS configuration)...' -ForegroundColor Yellow
Push-Location (Join-Path $root 'frontend')
npm run build:iis
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Frontend build failed.' }
Pop-Location

$browserOut = Join-Path $root 'frontend\dist\frontend\browser'
if (-not (Test-Path $browserOut)) {
  throw "Angular output not found: $browserOut"
}
Copy-Item (Join-Path $browserOut '*') $webOut -Recurse -Force

$setup = @"
SmartEPR — IIS deployment package
=================================

COPY THESE FOLDERS TO YOUR IIS SERVER:

  API (backend):  $apiOut
  Web (frontend): $webOut

RECOMMENDED IIS SETUP
---------------------

1) Install prerequisites on Windows Server / IIS machine:
   - IIS (Internet Information Services)
   - URL Rewrite module (for Angular SPA)
   - .NET 9.0 ASP.NET Core Hosting Bundle
     https://dotnet.microsoft.com/download/dotnet/9.0

2) SAME VPS (IIS + SQL on one server) — connection string in SmartEPR-Api\appsettings.Production.json:

   Server=localhost;Database=SmartERP;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;Encrypt=True;

   If SQL Express named instance:
   Server=localhost\\SQLEXPRESS;Database=SmartERP;...

   If Windows Authentication (IIS app pool user has SQL access):
   Server=localhost;Database=SmartERP;Integrated Security=True;TrustServerCertificate=True;

   Verify on VPS (SSMS or sqlcmd):
   sqlcmd -S localhost -d SmartERP -U YOUR_USER -P YOUR_PASSWORD -Q "SELECT 1"

3) API + Web on smarterp.pathsoft.in (recommended single domain):
   - Web site physical path: SmartEPR-Web  -> https://smarterp.pathsoft.in/
   - Add IIS Application under same site:
       Alias: api
       Physical path: SmartEPR-Api folder
       -> API at https://smarterp.pathsoft.in/api/health

   OR separate API site on port 5050 (update environment.iis.ts apiBaseUrl).

4) Edit appsettings.Production.json on server:
       * ConnectionStrings:DefaultConnection (use localhost — NOT remote IP)
       * Jwt:Secret (min 32 chars)
       * Cors:AllowedOrigins must include https://smarterp.pathsoft.in

5) SQL Server on same VPS — check:
   - SQL Server service running
   - TCP/IP enabled (SQL Server Configuration Manager)
   - Database SmartERP exists
   - SQL login has db access (or use Integrated Security)

6) Test on VPS locally first:
   - http://localhost/api/health  -> "database": true
   - Then: https://smarterp.pathsoft.in/api/health

7) Permissions
   - Grant IIS_IUSRS read on both folders
   - Grant App Pool identity read on API folder

Published: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

Set-Content -Path (Join-Path $publishRoot 'IIS-SETUP.txt') -Value $setup -Encoding UTF8

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host "API folder:  $apiOut"
Write-Host "Web folder:  $webOut"
Write-Host "Guide:       $(Join-Path $publishRoot 'IIS-SETUP.txt')"
