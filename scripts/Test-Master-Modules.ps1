# Test Master module APIs on PathSoft
# Run: powershell -ExecutionPolicy Bypass -File scripts\Test-Master-Modules.ps1

$ErrorActionPreference = 'Stop'
$base = 'https://smarterp.pathsoft.in/api'
$loginBody = '{"userName":"9423150066","password":"9423150066"}'

function Test-Api($Name, $ScriptBlock) {
    try {
        $result = & $ScriptBlock
        [PSCustomObject]@{ Test = $Name; Status = 'OK'; Detail = $result }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        [PSCustomObject]@{ Test = $Name; Status = "FAIL ($code)"; Detail = $_.Exception.Message }
    }
}

$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody
$token = $login.data.token
$headers = @{ Authorization = "Bearer $token" }

$tests = @()

$tests += Test-Api 'GET /master/class' {
    $r = Invoke-RestMethod -Uri "$base/master/class" -Headers $headers
    "success=$($r.success) count=$($r.data.Count)"
}

$tests += Test-Api 'POST /master/class (temp)' {
    $body = '{"classID":0,"className":"TEST-CLASS-AUTO","isActive":true}'
    $r = Invoke-RestMethod -Uri "$base/master/class" -Method POST -Headers $headers -ContentType 'application/json' -Body $body
    if (-not $r.success) { throw $r.message }
    $global:testClassId = $r.data.classID
    "id=$global:testClassId"
}

$tests += Test-Api 'GET /master/subject' {
    $r = Invoke-RestMethod -Uri "$base/master/subject" -Headers $headers
    "success=$($r.success) count=$($r.data.Count)"
}

$tests += Test-Api 'GET /master/academic-schedule/lookups' {
    $r = Invoke-RestMethod -Uri "$base/master/academic-schedule/lookups" -Headers $headers
    "orgs=$($r.data.sansthaOrgs.Count) classes=$($r.data.classes.Count)"
}

$tests += Test-Api 'GET /master/inventory/lookups' {
    $r = Invoke-RestMethod -Uri "$base/master/inventory/lookups" -Headers $headers
    "orgs=$($r.data.orgs.Count)"
}

if ($global:testClassId) {
    $tests += Test-Api 'DELETE /master/class (cleanup)' {
        $r = Invoke-RestMethod -Uri "$base/master/class/$($global:testClassId)" -Method DELETE -Headers $headers
        "success=$($r.success)"
    }
}

$tests | Format-Table -AutoSize
