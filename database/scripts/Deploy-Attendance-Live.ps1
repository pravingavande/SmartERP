# Safe Attendance module deploy for SmartERP_TESTING only
# - Does NOT connect to attendance_saas or any other database
# - Does NOT alter legacy dbo.Attendance (production Attendance app)
# - No DROP DATABASE / no DROP or TRUNCATE on existing tables
# - Idempotent: safe to re-run

param(
    [string]$Server = "157.20.211.118",
    [string]$Database = "SmartERP_TESTING",
    [string]$User = "ePathSoftIndiaValid22011994User",
    [string]$Password = "ePathSoftIndiaValid22011994"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-SqlFile {
    param([string]$FilePath)
    Write-Host "Running: $(Split-Path $FilePath -Leaf)" -ForegroundColor Cyan
    sqlcmd -S $Server -d $Database -U $User -P $Password -C -b -i $FilePath
    if ($LASTEXITCODE -ne 0) { throw "Failed: $FilePath" }
}

Write-Host "=== PRE-VERIFY ===" -ForegroundColor Yellow
Invoke-SqlFile (Join-Path $scriptDir "131_Attendance_Live_PreVerify.sql")

$deployScripts = @(
    "125_Attendance_Shifts.sql",
    "126_Attendance_MonthlyOff.sql",
    "127_Attendance_LeaveRequests.sql",
    "128_Attendance_Records.sql",
    "129_Attendance_Corrections.sql",
    "130_Attendance_Payroll.sql"
)

Write-Host "=== DEPLOY (safe / idempotent) ===" -ForegroundColor Yellow
foreach ($name in $deployScripts) {
    Invoke-SqlFile (Join-Path $scriptDir $name)
}

Write-Host "=== POST-VERIFY ===" -ForegroundColor Yellow
Invoke-SqlFile (Join-Path $scriptDir "131_Attendance_Live_PostVerify.sql")

Write-Host "=== DONE: Attendance module deployed safely on $Database ===" -ForegroundColor Green
