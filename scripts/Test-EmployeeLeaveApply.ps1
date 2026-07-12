# Hardcoded regression tests for Employee Leave Apply (/staff/leave-apply)
# Run: powershell -ExecutionPolicy Bypass -File scripts\Test-EmployeeLeaveApply.ps1

$ErrorActionPreference = 'Stop'

$Config = @{
  ApiBase      = 'https://smartepr-api-1098804108686.asia-south1.run.app/api'
  UserName     = '9423150066'
  Password     = '9423150066'
  OrgID        = 13
  OrgNoStaff   = 3
  TestReason   = 'HC-LEAVE-TEST'
}

$Results = New-Object System.Collections.Generic.List[object]
$script:Headers = $null
$script:Lookups = $null
$script:ApplyId = 0
$script:LeaveTypeId = 0
$script:PermId = 0
$script:AyId = 0
$script:EmployeeId = 0

function Add-Result([string]$Name, [bool]$Pass, [string]$Detail) {
  $Results.Add([pscustomobject]@{
      Test   = $Name
      Status = $(if ($Pass) { 'PASS' } else { 'FAIL' })
      Detail = $Detail
    }) | Out-Null
  if (-not $Pass) { Write-Host "FAIL: $Name - $Detail" -ForegroundColor Red }
}

function Invoke-LeaveApi {
  param([string]$Method = 'GET', [string]$Path, [object]$Body = $null)
  $uri = "$($Config.ApiBase)$Path"
  if ($Body) {
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $script:Headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 6)
  }
  return Invoke-RestMethod -Uri $uri -Method $Method -Headers $script:Headers
}

function Get-LeaveApply([long]$Id) {
  $r = Invoke-LeaveApi -Path "/leave/$Id"
  if (-not $r.success -or -not $r.data) { throw "GetById failed id=$Id" }
  return $r.data
}

function Save-LeaveApply([hashtable]$Payload) {
  $r = Invoke-LeaveApi -Method POST -Path '/leave' -Body $Payload
  if (-not $r.success -or -not $r.data.userLeaveApplyID) { throw "Save failed: $($r.message)" }
  return $r.data
}

function New-LeavePayload([long]$Id = 0, [hashtable]$Overrides = @{}) {
  $p = @{
    userLeaveApplyID    = $Id
    orgID               = $Config.OrgID
    recordNo            = $null
    tDate               = '2026-07-12'
    userID              = $script:EmployeeId
    leaveTypeID         = $script:LeaveTypeId
    leaveReason         = $Config.TestReason
    fromDate            = '2026-07-14'
    toDate              = '2026-07-16'
    adminRemak          = 'HC admin remark baseline'
    leavePermissionID   = $script:PermId
    ayID                = $script:AyId
  }
  foreach ($k in $Overrides.Keys) { $p[$k] = $Overrides[$k] }
  return $p
}

function Assert-NoOfDay($Data, [int]$Expected) {
  if ($Data.noOfDay -ne $Expected) { return "noOfDay expected $Expected got $($Data.noOfDay)" }
  return $null
}

# --- Setup ---
try {
  $login = Invoke-RestMethod -Uri "$($Config.ApiBase)/auth/login" -Method POST -ContentType 'application/json' -Body (@{
      userName = $Config.UserName; password = $Config.Password
    } | ConvertTo-Json)
  $script:Headers = @{ Authorization = "Bearer $($login.data.token)" }
  Add-Result '00 Login' $login.success "userId=$($login.data.userId)"

  $script:Lookups = Invoke-LeaveApi -Path '/leave/lookups'
  $lk = $script:Lookups.data.lookups
  $script:LeaveTypeId = $lk.leaveTypes[0].id
  $script:PermId = $lk.leavePermissions[0].id
  $script:AyId = $lk.ayList[0].ayID
  Add-Result '01 Lookups' $script:Lookups.success "types=$($lk.leaveTypes.Count) perms=$($lk.leavePermissions.Count) ay=$($script:AyId)"
}
catch {
  Add-Result '00 Setup' $false $_.Exception.Message
  $Results | Format-Table -AutoSize -Wrap
  exit 1
}

# T02 Employees org=13
try {
  $emps = Invoke-LeaveApi -Path "/leave/employees?orgId=$($Config.OrgID)"
  if ($emps.data.Count -lt 1) { throw 'no employees' }
  $script:EmployeeId = $emps.data[0].userID
  Add-Result 'T02 Employees by org' $true "userID=$($script:EmployeeId) count=$($emps.data.Count)"
}
catch { Add-Result 'T02 Employees by org' $false $_.Exception.Message }

# T03 Org without staff returns empty
try {
  $empty = Invoke-LeaveApi -Path "/leave/employees?orgId=$($Config.OrgNoStaff)"
  Add-Result 'T03 Org without employees' ($empty.data.Count -eq 0) "org=$($Config.OrgNoStaff) count=$($empty.data.Count)"
}
catch { Add-Result 'T03 Org without employees' $false $_.Exception.Message }

# T04 Next record no
try {
  $next = Invoke-LeaveApi -Path "/leave/next-record-no?orgId=$($Config.OrgID)"
  $rn = $next.data.nextRecordNo
  Add-Result 'T04 Next record no' ($rn -ge 1) "nextRecordNo=$rn"
}
catch { Add-Result 'T04 Next record no' $false $_.Exception.Message }

# Reuse existing HC test row if present
$existing = Invoke-LeaveApi -Path "/leave?orgId=$($Config.OrgID)&ayId=$($script:AyId)"
$reuse = $existing.data | Where-Object { $_.leaveReason -like 'HC-LEAVE-TEST*' } | Select-Object -First 1
if ($reuse) {
  $script:ApplyId = $reuse.userLeaveApplyID
  Add-Result 'T0 Reuse existing' $true "id=$($script:ApplyId)"
}

# T05 Add baseline
try {
  $next = Invoke-LeaveApi -Path "/leave/next-record-no?orgId=$($Config.OrgID)"
  $created = Save-LeaveApply (New-LeavePayload $script:ApplyId @{
      recordNo = $next.data.nextRecordNo
      leaveReason = 'HC-LEAVE-TEST baseline'
      adminRemak = 'HC admin remark on create'
    })
  $script:ApplyId = $created.userLeaveApplyID
  $err = Assert-NoOfDay $created 3
  if (-not $err -and $created.recordNo -lt 1) { $err = 'recordNo missing' }
  Add-Result 'T05 Add baseline' (-not $err) $(if ($err) { $err } else { "id=$($script:ApplyId) recordNo=$($created.recordNo) noOfDay=3" })
}
catch { Add-Result 'T05 Add baseline' $false $_.Exception.Message }

# T06 Add appears in list
try {
  $list = Invoke-LeaveApi -Path "/leave?orgId=$($Config.OrgID)&ayId=$($script:AyId)"
  $found = $list.data | Where-Object { $_.userLeaveApplyID -eq $script:ApplyId }
  Add-Result 'T06 Add in list' ($null -ne $found) "found recordNo=$($found.recordNo)"
}
catch { Add-Result 'T06 Add in list' $false $_.Exception.Message }

# T07 GetById for edit
try {
  $row = Get-LeaveApply $script:ApplyId
  $pass = $row.userID -eq $script:EmployeeId -and $row.leaveTypeID -eq $script:LeaveTypeId
  Add-Result 'T07 GetById' $pass "userID=$($row.userID) reason=$($row.leaveReason)"
}
catch { Add-Result 'T07 GetById' $false $_.Exception.Message }

# T08 Edit dates + NoOfDay recalc (14-18 = 5 days)
try {
  $cur = Get-LeaveApply $script:ApplyId
  $edited = Save-LeaveApply (New-LeavePayload $script:ApplyId @{
      recordNo = $cur.recordNo
      leaveReason = 'HC-LEAVE-TEST EDIT dates'
      fromDate = '2026-07-14'
      toDate = '2026-07-18'
      adminRemak = 'HC admin remark UPDATED'
    })
  $err = Assert-NoOfDay $edited 5
  if (-not $err -and $edited.adminRemak -ne 'HC admin remark UPDATED') { $err = 'adminRemak not updated' }
  Add-Result 'T08 Edit dates + NoOfDay' (-not $err) $(if ($err) { $err } else { 'noOfDay=5 admin updated' })
}
catch { Add-Result 'T08 Edit dates + NoOfDay' $false $_.Exception.Message }

# T09 Edit single day leave (from=to => 1 day)
try {
  $cur = Get-LeaveApply $script:ApplyId
  $edited = Save-LeaveApply (New-LeavePayload $script:ApplyId @{
      recordNo = $cur.recordNo
      leaveReason = 'HC-LEAVE-TEST single day'
      fromDate = '2026-07-20'
      toDate = '2026-07-20'
    })
  $err = Assert-NoOfDay $edited 1
  Add-Result 'T09 Single day leave' (-not $err) $(if ($err) { $err } else { 'noOfDay=1' })
}
catch { Add-Result 'T09 Single day leave' $false $_.Exception.Message }

# T10 Edit leave type + permission
try {
  $cur = Get-LeaveApply $script:ApplyId
  $types = $script:Lookups.data.lookups.leaveTypes
  $perms = $script:Lookups.data.lookups.leavePermissions
  $altType = if ($types.Count -gt 1) { $types[1].id } else { $types[0].id }
  $altPerm = if ($perms.Count -gt 1) { $perms[1].id } else { $perms[0].id }
  $edited = Save-LeaveApply (New-LeavePayload $script:ApplyId @{
      recordNo = $cur.recordNo
      leaveTypeID = $altType
      leavePermissionID = $altPerm
      leaveReason = 'HC-LEAVE-TEST type+perm change'
      fromDate = '2026-07-14'
      toDate = '2026-07-16'
    })
  $pass = $edited.leaveTypeID -eq $altType -and $edited.leavePermissionID -eq $altPerm
  Add-Result 'T10 Edit leave type + permission' $pass "type=$($edited.leaveTypeID) perm=$($edited.leavePermissionID)"
}
catch { Add-Result 'T10 Edit leave type + permission' $false $_.Exception.Message }

# T11 Edit admin remark multiline (long text)
try {
  $cur = Get-LeaveApply $script:ApplyId
  $longRemark = 'HC multiline admin remark line1 | line2 | approved by test'
  $edited = Save-LeaveApply (New-LeavePayload $script:ApplyId @{
      recordNo = $cur.recordNo
      adminRemak = $longRemark
      leaveReason = 'HC-LEAVE-TEST long admin remark'
    })
  $reloaded = Get-LeaveApply $script:ApplyId
  Add-Result 'T11 Long admin remark' ($reloaded.adminRemak -eq $longRemark) "len=$($reloaded.adminRemak.Length)"
}
catch { Add-Result 'T11 Long admin remark' $false $_.Exception.Message }

# T12 Round-trip (simulate UI edit reload)
try {
  $cur = Get-LeaveApply $script:ApplyId
  $payload = @{
    userLeaveApplyID = $cur.userLeaveApplyID
    orgID = $cur.orgID
    recordNo = $cur.recordNo
    tDate = if ($cur.tDate) { $cur.tDate.ToString().Substring(0, 10) } else { '2026-07-12' }
    userID = $cur.userID
    leaveTypeID = $cur.leaveTypeID
    leaveReason = $cur.leaveReason
    fromDate = if ($cur.fromDate) { $cur.fromDate.ToString().Substring(0, 10) } else { '' }
    toDate = if ($cur.toDate) { $cur.toDate.ToString().Substring(0, 10) } else { '' }
    adminRemak = $cur.adminRemak
    leavePermissionID = $cur.leavePermissionID
    ayID = $cur.ayID
  }
  Save-LeaveApply $payload | Out-Null
  $after = Get-LeaveApply $script:ApplyId
  $pass = $after.leaveReason -eq $cur.leaveReason -and $after.noOfDay -eq $cur.noOfDay
  Add-Result 'T12 Round-trip save' $pass "noOfDay=$($after.noOfDay)"
}
catch { Add-Result 'T12 Round-trip save' $false $_.Exception.Message }

# T13 Second edit visit
try {
  $cur = Get-LeaveApply $script:ApplyId
  $edited = Save-LeaveApply (New-LeavePayload $script:ApplyId @{
      recordNo = $cur.recordNo
      leaveReason = 'HC-LEAVE-TEST SECOND VISIT'
      fromDate = '2026-07-01'
      toDate = '2026-07-03'
    })
  $err = Assert-NoOfDay $edited 3
  $list = Invoke-LeaveApi -Path "/leave?orgId=$($Config.OrgID)&ayId=$($script:AyId)"
  $found = $list.data | Where-Object { $_.userLeaveApplyID -eq $script:ApplyId -and $_.leaveReason -like '*SECOND VISIT*' }
  Add-Result 'T13 Second edit visit' ((-not $err) -and $found) $(if ($err) { $err } else { 'list+db ok' })
}
catch { Add-Result 'T13 Second edit visit' $false $_.Exception.Message }

# T14 Auto recordNo when zero on new add
try {
  $emps = Invoke-LeaveApi -Path "/leave/employees?orgId=$($Config.OrgID)"
  $emp2 = if ($emps.data.Count -gt 1) { $emps.data[1].userID } else { $emps.data[0].userID }
  $created = Save-LeaveApply (New-LeavePayload 0 @{
      recordNo = 0
      userID = $emp2
      leaveReason = 'HC-LEAVE-TEST auto recordNo'
      fromDate = '2026-08-01'
      toDate = '2026-08-02'
      adminRemak = 'auto rn'
    })
  $pass = $created.recordNo -ge 1 -and $created.noOfDay -eq 2
  Add-Result 'T14 Auto recordNo on add' $pass "id=$($created.userLeaveApplyID) recordNo=$($created.recordNo)"
  # cleanup optional - leave for UI verify
}
catch { Add-Result 'T14 Auto recordNo on add' $false $_.Exception.Message }

# Validations
try {
  $bad1 = Invoke-LeaveApi -Method POST -Path '/leave' -Body (New-LeavePayload 0 @{ userID = $null })
  Add-Result 'V01 Validation missing employee' (-not ($bad1.success -and $bad1.data)) $bad1.message
}
catch { Add-Result 'V01 Validation missing employee' $true 'rejected' }

try {
  $bad2 = Invoke-LeaveApi -Method POST -Path '/leave' -Body (New-LeavePayload 0 @{ leaveTypeID = $null })
  Add-Result 'V02 Validation missing leave type' (-not ($bad2.success -and $bad2.data)) $bad2.message
}
catch { Add-Result 'V02 Validation missing leave type' $true 'rejected' }

try {
  $bad3 = Invoke-LeaveApi -Method POST -Path '/leave' -Body (New-LeavePayload 0 @{ fromDate = $null; toDate = $null })
  Add-Result 'V03 Validation missing dates' (-not ($bad3.success -and $bad3.data)) $bad3.message
}
catch { Add-Result 'V03 Validation missing dates' $true 'rejected' }

# DB verify
try {
  $db = sqlcmd -S "157.20.211.118,1433" -d SmartERP -U "ePathSoftIndiaValid22011994User" -P "ePathSoftIndiaValid22011994" -C -Q "SELECT UserLeaveApplyID, OrgID, RecordNo, NoOfDay, LeaveReason, AdminRemak FROM dbo.UserLeaveApply WHERE UserLeaveApplyID=$($script:ApplyId)" -W -h-1 2>$null
  $dbText = ($db | Out-String)
  Add-Result 'DB Verify main row' ($dbText -match 'SECOND VISIT') "id=$($script:ApplyId)"
}
catch { Add-Result 'DB Verify main row' $false $_.Exception.Message }

Write-Host ''
$Results | Format-Table -AutoSize -Wrap
$fail = @($Results | Where-Object Status -eq 'FAIL').Count
$total = $Results.Count
Write-Host "SUMMARY: $total tests, $($total - $fail) passed, $fail failed"
Write-Host "Test leave apply UserLeaveApplyID=$($script:ApplyId) OrgID=$($Config.OrgID) AyID=$($script:AyId)"
Write-Host "UI: https://smartepr.web.app/staff/leave-apply"
if ($fail -gt 0) { exit 1 }
