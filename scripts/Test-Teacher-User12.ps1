$api = 'https://smarterp.pathsoft.in/api'
$login = Invoke-RestMethod -Uri "$api/auth/login" -Method POST -ContentType 'application/json' -Body '{"userName":"9423150066","password":"9423150066"}'
$h = @{ Authorization = "Bearer $($login.data.token)" }

Write-Host '=== Staff /employee ===' -ForegroundColor Cyan
try {
    $staff = Invoke-RestMethod -Uri "$api/employee" -Headers $h
    $found = @($staff.data | Where-Object { ($_.userID -eq 12) -or ($_.UserID -eq 12) })
    Write-Host "Count: $($staff.data.Count), UserID=12: $($found.Count -gt 0)"
    if ($found.Count -gt 0) { $found[0] | Format-List }
} catch {
    Write-Host $_.Exception.Message
}

Write-Host '=== Search teacher list for partial match user 12 org ===' -ForegroundColor Cyan
# Try getById via raw - already failed
