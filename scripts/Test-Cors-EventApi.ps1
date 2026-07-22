$api = 'https://smarterp.pathsoft.in/api'
$origin = 'https://smartepr.web.app'

Write-Host '=== OPTIONS preflight ===' -ForegroundColor Cyan
try {
    $opt = Invoke-WebRequest -Uri "$api/eventcalendar/events/2" -Method OPTIONS -Headers @{
        Origin = $origin
        'Access-Control-Request-Method' = 'GET'
        'Access-Control-Request-Headers' = 'authorization,content-type'
    } -UseBasicParsing
    Write-Host "Status: $($opt.StatusCode)"
    $opt.Headers.Keys | Where-Object { $_ -like 'Access-Control*' } | ForEach-Object {
        Write-Host "$_`: $($opt.Headers[$_])"
    }
} catch {
    Write-Host "OPTIONS failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $r = $_.Exception.Response
        Write-Host "Status: $([int]$r.StatusCode)"
    }
}

Write-Host "`n=== GET without auth ===" -ForegroundColor Cyan
try {
    $get = Invoke-WebRequest -Uri "$api/eventcalendar/events/2" -Method GET -Headers @{ Origin = $origin } -UseBasicParsing
    Write-Host "Status: $($get.StatusCode)"
} catch {
    $resp = $_.Exception.Response
    if ($resp) {
        Write-Host "Status: $([int]$resp.StatusCode)"
        Write-Host "CORS header: $($resp.Headers['Access-Control-Allow-Origin'])"
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        Write-Host "Body: $($reader.ReadToEnd().Substring(0, [Math]::Min(300, 500)))"
    }
}

Write-Host "`n=== Login + GET event 2 ===" -ForegroundColor Cyan
try {
    $login = Invoke-RestMethod -Uri "$api/auth/login" -Method POST -ContentType 'application/json' -Body '{"userName":"9423150066","password":"9423150066"}'
    $token = $login.data.token
    $get2 = Invoke-WebRequest -Uri "$api/eventcalendar/events/2" -Method GET -Headers @{
        Origin = $origin
        Authorization = "Bearer $token"
    } -UseBasicParsing
    Write-Host "Status: $($get2.StatusCode)"
    Write-Host "CORS: $($get2.Headers['Access-Control-Allow-Origin'])"
    Write-Host "Body prefix: $($get2.Content.Substring(0, [Math]::Min(200, $get2.Content.Length)))"
} catch {
    $resp = $_.Exception.Response
    if ($resp) {
        Write-Host "Status: $([int]$resp.StatusCode)"
        Write-Host "CORS header: $($resp.Headers['Access-Control-Allow-Origin'])"
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Body: $body"
    } else {
        Write-Host "Error: $($_.Exception.Message)"
    }
}
