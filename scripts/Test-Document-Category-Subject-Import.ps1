# Test Document / Category / Subject master import source APIs
# Run: powershell -ExecutionPolicy Bypass -File scripts\Test-Document-Category-Subject-Import.ps1

$ErrorActionPreference = 'Stop'
$base = 'https://smarterp.pathsoft.in/api'
$loginBody = '{"userName":"9423150066","password":"9423150066"}'

function Test-Endpoint([string]$Name, [string]$Path) {
    try {
        $r = Invoke-RestMethod -Uri "$base$Path" -Headers $script:Headers
        $count = if ($null -ne $r.data) { @($r.data).Count } else { 0 }
        $first = if ($count -gt 0) { ($r.data | Select-Object -First 1 | ConvertTo-Json -Compress) } else { '' }
        [PSCustomObject]@{
            Test    = $Name
            Status  = if ($r.success) { 'OK' } else { 'FAIL' }
            Count   = $count
            Message = $r.message
            First   = $first
        }
    }
    catch {
        $code = $_.Exception.Response.StatusCode.value__
        $body = ''
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
        } catch { }
        [PSCustomObject]@{
            Test    = $Name
            Status  = "HTTP $code"
            Count   = 0
            Message = if ($body) { $body } else { $_.Exception.Message }
            First   = ''
        }
    }
}

$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody
if (-not $login.success) { throw "Login failed: $($login.message)" }
$script:Headers = @{ Authorization = "Bearer $($login.data.token)" }

$tests = @(
    Test-Endpoint 'Class org 1 (baseline)' '/master/class?orgId=1'
    Test-Endpoint 'Document org 1 (import source)' '/master/document?orgId=1'
    Test-Endpoint 'Document org 13' '/master/document?orgId=13'
    Test-Endpoint 'Category org 1 (import source)' '/master/category?orgId=1'
    Test-Endpoint 'Category org 13' '/master/category?orgId=13'
    Test-Endpoint 'Subject org 1 (import source)' '/master/subject?orgId=1'
    Test-Endpoint 'Subject org 13' '/master/subject?orgId=13'
)

$tests | Format-Table -AutoSize -Wrap

$failed = @($tests | Where-Object { $_.Status -ne 'OK' -or ($_.Test -match 'org 1' -and $_.Count -eq 0) })
if ($failed.Count -gt 0) {
    Write-Host ''
    Write-Host 'Issues detected:' -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host " - $($_.Test): status=$($_.Status) count=$($_.Count) msg=$($_.Message)" -ForegroundColor Yellow }
    exit 1
}

Write-Host 'All import-source endpoints returned data.' -ForegroundColor Green
