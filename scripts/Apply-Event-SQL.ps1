# Run ON the IIS/SQL Server machine (where API uses localhost).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\Apply-Event-SQL.ps1

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot '..\database\scripts\092_Event_StringAgg_Ordering_Fix.sql'
$scriptPath = (Resolve-Path $scriptPath).Path

$server = if ($env:SMARTERP_SQL_SERVER) { $env:SMARTERP_SQL_SERVER } else { 'localhost' }
$database = if ($env:SMARTERP_SQL_DATABASE) { $env:SMARTERP_SQL_DATABASE } else { 'SmartERP_TESTING' }
$user = if ($env:SMARTERP_SQL_USER) { $env:SMARTERP_SQL_USER } else { 'ePathSoftIndiaValid22011994User' }
$password = if ($env:SMARTERP_SQL_PASSWORD) { $env:SMARTERP_SQL_PASSWORD } else { 'ePathSoftIndiaValid22011994' }

Write-Host "Applying 092_Event_StringAgg_Ordering_Fix.sql to $server / $database ..." -ForegroundColor Cyan
sqlcmd -S $server -d $database -U $user -P $password -C -i $scriptPath
if ($LASTEXITCODE -ne 0) { throw "SQL apply failed (exit $LASTEXITCODE)." }
Write-Host "Done. Restart IIS app pool, then test event save on /event-calendar." -ForegroundColor Green
