# Hardcoded regression tests for /staff (Teachers & Staff) — education, documents, school rows on Add/Edit.
# Run: powershell -ExecutionPolicy Bypass -File scripts\Test-EmployeeStaffForm.ps1
# Requires: live API access (default: production Cloud Run)

$ErrorActionPreference = 'Stop'

# --- Hardcoded config (do not use random data for assertions) ---
$Config = @{
  ApiBase    = 'https://smartepr-api-1098804108686.asia-south1.run.app/api'
  UserName   = '9423150066'
  Password   = '9423150066'
  OrgID      = 13
  SchoolCode = 13
  TestMobile = '9700001234'
  TestPrefix = 'HC-STAFF-TEST'
}

$Results = New-Object System.Collections.Generic.List[object]
$script:Headers = $null
$script:Lookups = $null
$script:UserId = 0

function Add-Result([string]$Name, [bool]$Pass, [string]$Detail) {
  $Results.Add([pscustomobject]@{
      Test   = $Name
      Status = $(if ($Pass) { 'PASS' } else { 'FAIL' })
      Detail = $Detail
    }) | Out-Null
  if (-not $Pass) { Write-Host "FAIL: $Name - $Detail" -ForegroundColor Red }
}

function Invoke-StaffApi {
  param(
    [string]$Method = 'GET',
    [string]$Path,
    [object]$Body = $null
  )
  $uri = "$($Config.ApiBase)$Path"
  if ($Body) {
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $script:Headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8)
  }
  return Invoke-RestMethod -Uri $uri -Method $Method -Headers $script:Headers
}

function Format-DateOnly($Value) {
  if (-not $Value) { return $null }
  $text = $Value.ToString()
  if ($text.Length -ge 10) { return $text.Substring(0, 10) }
  return $text
}

function Get-Employee {
  param([long]$Id)
  $r = Invoke-StaffApi -Path "/employee/$Id"
  if (-not $r.success) { throw "GetById failed for $Id" }
  return $r.data
}

function Save-Employee([hashtable]$Payload) {
  $r = Invoke-StaffApi -Method POST -Path '/employee' -Body $Payload
  if (-not $r.success -or -not $r.data.userID) { throw "Save failed: $($r.message)" }
  return $r.data
}

function New-BasePayload([long]$UserId = 0) {
  $lk = $script:Lookups.data.lookups
  return @{
    userID            = $UserId
    schoolCode        = $Config.SchoolCode
    orgID             = $Config.OrgID
    userTypeID        = $lk.userTypes[0].userTypeID
    designationCode   = $lk.designations[0].code
    firstname         = $Config.TestPrefix
    middleName        = 'Mid'
    lastName          = 'Employee'
    permanentAddress  = 'HC Permanent Addr'
    localAddress      = 'HC Local Addr'
    genderCode        = $lk.genders[0].code
    dob               = '1985-01-15'
    adharCardNo       = '111122223333'
    mobileNo1         = $Config.TestMobile
    mobileNo2         = ''
    emailID           = 'hc-staff-test@smartepr.local'
    panNo             = 'AAAAA1111A'
    remark            = 'Hardcoded regression employee'
    appUserName       = $Config.TestMobile
    appPassword       = $Config.TestMobile
    isActive          = $true
    education         = @()
    documents         = @()
    schools           = @()
  }
}

function Assert-Education($Emp, [int]$ExpectedCount, [string]$University, [string]$Percentage = $null) {
  if ($Emp.education.Count -ne $ExpectedCount) { return "education count expected $ExpectedCount got $($Emp.education.Count)" }
  if ($University -and $Emp.education[0].univercity -ne $University) { return "university expected '$University' got '$($Emp.education[0].univercity)'" }
  if ($Percentage -and $Emp.education[0].percentage -ne $Percentage) { return "percentage expected '$Percentage' got '$($Emp.education[0].percentage)'" }
  if (-not $Emp.education[0].educationCodePassExam) { return 'educationCodePassExam is null' }
  return $null
}

function Assert-Documents($Emp, [int]$ExpectedCount, [string]$Path = $null) {
  if ($Emp.documents.Count -ne $ExpectedCount) { return "documents count expected $ExpectedCount got $($Emp.documents.Count)" }
  if ($Path -and $Emp.documents[0].empDocumentPath -ne $Path) { return "doc path expected '$Path' got '$($Emp.documents[0].empDocumentPath)'" }
  if ($ExpectedCount -gt 0 -and -not $Emp.documents[0].empDocumentCode) { return 'empDocumentCode is null' }
  return $null
}

function Assert-Schools($Emp, [int]$ExpectedCount, [string]$Subject = $null, [string]$ZpOrder = $null) {
  if ($Emp.schools.Count -ne $ExpectedCount) { return "schools count expected $ExpectedCount got $($Emp.schools.Count)" }
  if ($Subject -and $Emp.schools[0].teachSubject -ne $Subject) { return "subject expected '$Subject' got '$($Emp.schools[0].teachSubject)'" }
  if ($ZpOrder -and $Emp.schools[0].zpTransferOrderNoAndDate -ne $ZpOrder) { return "zp order expected '$ZpOrder' got '$($Emp.schools[0].zpTransferOrderNoAndDate)'" }
  if ($ExpectedCount -gt 0 -and -not $Emp.schools[0].orgID) { return 'school orgID is null' }
  return $null
}

# --- Login & lookups ---
try {
  $login = Invoke-RestMethod -Uri "$($Config.ApiBase)/auth/login" -Method POST -ContentType 'application/json' -Body (@{
      userName = $Config.UserName
      password = $Config.Password
    } | ConvertTo-Json)
  $script:Headers = @{ Authorization = "Bearer $($login.data.token)" }
  Add-Result '00 Login' $login.success "userId=$($login.data.userId)"

  $script:Lookups = Invoke-StaffApi -Path '/employee/lookups'
  Add-Result '01 Lookups' $script:Lookups.success "designations=$($script:Lookups.data.lookups.designations.Count)"
}
catch {
  Add-Result '00 Setup' $false $_.Exception.Message
  $Results | Format-Table -AutoSize -Wrap
  exit 1
}

$lk = $script:Lookups.data.lookups
$eduCode = $lk.educations[0].code
$eduCode2 = $lk.educations[1].code
$docCode1 = $lk.documents[0].code
$docCode2 = if ($lk.documents.Count -gt 1) { $lk.documents[1].code } else { $lk.documents[0].code }
$qualCode = $lk.qualificationTypes[0].code
$statusCode = $lk.educationStatuses[0].code
$org2 = $script:Lookups.data.orgs | Where-Object { $_.orgID -ne $Config.OrgID } | Select-Object -First 1

# Reuse hardcoded test employee if it already exists (idempotent re-runs)
$existing = Invoke-StaffApi -Path "/employee?orgId=$($Config.OrgID)&search=$($Config.TestMobile)"
if ($existing.data | Where-Object { $_.mobileNo1 -eq $Config.TestMobile }) {
  $script:UserId = ($existing.data | Where-Object { $_.mobileNo1 -eq $Config.TestMobile } | Select-Object -First 1).userID
  Add-Result 'T0 Reuse existing test employee' $true "userID=$($script:UserId)"
}

# --- T1: Create baseline (1 edu, 1 doc, 1 school) ---
try {
  $p = New-BasePayload $script:UserId
  $p.education = @(@{
      srNo = 1; educationCodePassExam = $eduCode; univercity = 'HC University A'
      passingYear = '2010'; percentage = '70'; qualificationTypeCode = $qualCode; educationStatusCode = $statusCode
    })
  $p.documents = @(@{ empDocumentCode = $docCode1; empDocumentPath = 'hc-aadhar.pdf' })
  $p.schools = @(@{
      srNo = 1; orgID = $Config.OrgID; schoolCode = $Config.SchoolCode; designationCode = $lk.designations[0].code
      teachClass = '8'; teachSubject = 'Marathi'; schoolJoiningDate = '2018-06-01'
      sansthaTransferOrderNoAndDate = 'SAN/2018'; zpTransferOrderNoAndDate = 'ZP/2018/001'
    })
  $created = Save-Employee $p
  $script:UserId = $created.userID
  $loaded = Get-Employee $script:UserId
  $err = Assert-Education $loaded 1 'HC University A' '70'
  if (-not $err) { $err = Assert-Documents $loaded 1 'hc-aadhar.pdf' }
  if (-not $err) { $err = Assert-Schools $loaded 1 'Marathi' 'ZP/2018/001' }
  Add-Result 'T1 Create baseline' (-not $err) $(if ($err) { $err } else { "userID=$($script:UserId)" })
}
catch { Add-Result 'T1 Create baseline' $false $_.Exception.Message }

# --- T2: Edit education only (documents/schools must survive) ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.remark = 'Edited education only'
  $p.education = @(@{
      srNo = 1; educationCodePassExam = $eduCode; univercity = 'HC University B EDITED'
      passingYear = '2010'; percentage = '78'; qualificationTypeCode = $qualCode; educationStatusCode = $statusCode
    })
  $p.documents = @(@{ empDocumentCode = $cur.documents[0].empDocumentCode; empDocumentPath = $cur.documents[0].empDocumentPath })
  $p.schools = @(@{
      srNo = 1; orgID = $cur.schools[0].orgID; schoolCode = $cur.schools[0].schoolCode
      designationCode = $cur.schools[0].designationCode; teachClass = $cur.schools[0].teachClass
      teachSubject = $cur.schools[0].teachSubject; schoolJoiningDate = '2018-06-01'
      sansthaTransferOrderNoAndDate = $cur.schools[0].sansthaTransferOrderNoAndDate
      zpTransferOrderNoAndDate = $cur.schools[0].zpTransferOrderNoAndDate
    })
  Save-Employee $p | Out-Null
  $loaded = Get-Employee $script:UserId
  $err = Assert-Education $loaded 1 'HC University B EDITED' '78'
  if (-not $err) { $err = Assert-Documents $loaded 1 'hc-aadhar.pdf' }
  if (-not $err) { $err = Assert-Schools $loaded 1 'Marathi' 'ZP/2018/001' }
  Add-Result 'T2 Edit education only' (-not $err) $(if ($err) { $err } else { 'child rows preserved' })
}
catch { Add-Result 'T2 Edit education only' $false $_.Exception.Message }

# --- T3: Add 2nd education row ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.education = @(
    @{
      srNo = 1; educationCodePassExam = $eduCode; univercity = 'HC University B EDITED'
      passingYear = '2010'; percentage = '78'; qualificationTypeCode = $qualCode; educationStatusCode = $statusCode
    },
    @{
      srNo = 2; educationCodePassExam = $eduCode2; univercity = 'HC University C'
      passingYear = '2012'; percentage = '65'; qualificationTypeCode = $qualCode; educationStatusCode = $statusCode
    }
  )
  $p.documents = @(@{ empDocumentCode = $cur.documents[0].empDocumentCode; empDocumentPath = $cur.documents[0].empDocumentPath })
  $p.schools = @(@{
      srNo = 1; orgID = $cur.schools[0].orgID; schoolCode = $cur.schools[0].schoolCode
      designationCode = $cur.schools[0].designationCode; teachClass = $cur.schools[0].teachClass
      teachSubject = $cur.schools[0].teachSubject; schoolJoiningDate = '2018-06-01'
      zpTransferOrderNoAndDate = $cur.schools[0].zpTransferOrderNoAndDate
    })
  Save-Employee $p | Out-Null
  $loaded = Get-Employee $script:UserId
  $pass = $loaded.education.Count -eq 2 -and $loaded.education[1].univercity -eq 'HC University C'
  Add-Result 'T3 Add 2nd education row' $pass "count=$($loaded.education.Count) row2=$($loaded.education[1].univercity)"
}
catch { Add-Result 'T3 Add 2nd education row' $false $_.Exception.Message }

# --- T4: Remove 1 education row (keep 1) ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.education = @(@{
      srNo = 1; educationCodePassExam = $eduCode; univercity = 'HC University FINAL'
      passingYear = '2010'; percentage = '80'; qualificationTypeCode = $qualCode; educationStatusCode = $statusCode
    })
  $p.documents = @(@{ empDocumentCode = $cur.documents[0].empDocumentCode; empDocumentPath = $cur.documents[0].empDocumentPath })
  $p.schools = @(@{
      srNo = 1; orgID = $cur.schools[0].orgID; schoolCode = $cur.schools[0].schoolCode
      designationCode = $cur.schools[0].designationCode; teachClass = $cur.schools[0].teachClass
      teachSubject = $cur.schools[0].teachSubject; schoolJoiningDate = '2018-06-01'
      zpTransferOrderNoAndDate = $cur.schools[0].zpTransferOrderNoAndDate
    })
  Save-Employee $p | Out-Null
  $loaded = Get-Employee $script:UserId
  $err = Assert-Education $loaded 1 'HC University FINAL' '80'
  Add-Result 'T4 Remove education row' (-not $err) $(if ($err) { $err } else { 'single row kept' })
}
catch { Add-Result 'T4 Remove education row' $false $_.Exception.Message }

# --- T5: Edit document + add 2nd document ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.education = @(@{
      srNo = 1; educationCodePassExam = $cur.education[0].educationCodePassExam
      univercity = $cur.education[0].univercity; passingYear = $cur.education[0].passingYear
      percentage = $cur.education[0].percentage; qualificationTypeCode = $cur.education[0].qualificationTypeCode
      educationStatusCode = $cur.education[0].educationStatusCode
    })
  $p.documents = @(
    @{ empDocumentCode = $docCode1; empDocumentPath = 'hc-aadhar-UPDATED.pdf' },
    @{ empDocumentCode = $docCode2; empDocumentPath = 'hc-pan.pdf' }
  )
  $p.schools = @(@{
      srNo = 1; orgID = $cur.schools[0].orgID; schoolCode = $cur.schools[0].schoolCode
      designationCode = $cur.schools[0].designationCode; teachClass = $cur.schools[0].teachClass
      teachSubject = $cur.schools[0].teachSubject; schoolJoiningDate = '2018-06-01'
      zpTransferOrderNoAndDate = $cur.schools[0].zpTransferOrderNoAndDate
    })
  Save-Employee $p | Out-Null
  $loaded = Get-Employee $script:UserId
  $pass = $loaded.documents.Count -eq 2 -and $loaded.documents[0].empDocumentPath -eq 'hc-aadhar-UPDATED.pdf'
  Add-Result 'T5 Edit/add documents' $pass "count=$($loaded.documents.Count) path=$($loaded.documents[0].empDocumentPath)"
}
catch { Add-Result 'T5 Edit/add documents' $false $_.Exception.Message }

# --- T6: Edit basic only — child rows must NOT be wiped ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.firstname = 'HC-STAFF-TEST-BASIC-ONLY'
  $p.permanentAddress = 'Only basic field changed'
  $p.education = @(@{
      srNo = 1; educationCodePassExam = $cur.education[0].educationCodePassExam
      univercity = $cur.education[0].univercity; passingYear = $cur.education[0].passingYear
      percentage = $cur.education[0].percentage; qualificationTypeCode = $cur.education[0].qualificationTypeCode
      educationStatusCode = $cur.education[0].educationStatusCode
    })
  $p.documents = @(
    @{ empDocumentCode = $cur.documents[0].empDocumentCode; empDocumentPath = $cur.documents[0].empDocumentPath },
    @{ empDocumentCode = $cur.documents[1].empDocumentCode; empDocumentPath = $cur.documents[1].empDocumentPath }
  )
  $p.schools = @(@{
      srNo = 1; orgID = $cur.schools[0].orgID; schoolCode = $cur.schools[0].schoolCode
      designationCode = $cur.schools[0].designationCode; teachClass = $cur.schools[0].teachClass
      teachSubject = $cur.schools[0].teachSubject; schoolJoiningDate = '2018-06-01'
      zpTransferOrderNoAndDate = $cur.schools[0].zpTransferOrderNoAndDate
    })
  Save-Employee $p | Out-Null
  $loaded = Get-Employee $script:UserId
  $pass = $loaded.firstname -eq 'HC-STAFF-TEST-BASIC-ONLY' -and $loaded.education[0].univercity -eq 'HC University FINAL' -and $loaded.documents.Count -eq 2
  Add-Result 'T6 Edit basic only (no child loss)' $pass "edu=$($loaded.education[0].univercity) docs=$($loaded.documents.Count)"
}
catch { Add-Result 'T6 Edit basic only (no child loss)' $false $_.Exception.Message }

# --- T7: Edit school + ZP transfer order ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.firstname = 'HC-STAFF-TEST-BASIC-ONLY'
  $p.education = @(@{
      srNo = 1; educationCodePassExam = $cur.education[0].educationCodePassExam
      univercity = $cur.education[0].univercity; passingYear = $cur.education[0].passingYear
      percentage = $cur.education[0].percentage; qualificationTypeCode = $cur.education[0].qualificationTypeCode
      educationStatusCode = $cur.education[0].educationStatusCode
    })
  $p.documents = @(
    @{ empDocumentCode = $cur.documents[0].empDocumentCode; empDocumentPath = $cur.documents[0].empDocumentPath },
    @{ empDocumentCode = $cur.documents[1].empDocumentCode; empDocumentPath = $cur.documents[1].empDocumentPath }
  )
  $p.schools = @(@{
      srNo = 1; orgID = $Config.OrgID; schoolCode = $Config.SchoolCode; designationCode = $lk.designations[0].code
      teachClass = '9'; teachSubject = 'Science'; schoolJoiningDate = '2019-07-01'; schoolLeaveDate = $null
      sansthaTransferOrderNoAndDate = 'SAN/2019'; zpTransferOrderNoAndDate = 'ZP/2019/REVISED'
    })
  Save-Employee $p | Out-Null
  $loaded = Get-Employee $script:UserId
  $err = Assert-Schools $loaded 1 'Science' 'ZP/2019/REVISED'
  Add-Result 'T7 Edit school + ZP order' (-not $err) $(if ($err) { $err } else { 'zp saved' })
}
catch { Add-Result 'T7 Edit school + ZP order' $false $_.Exception.Message }

# --- T8: Add 2nd school row ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.firstname = 'HC-STAFF-TEST-BASIC-ONLY'
  $p.education = @(@{
      srNo = 1; educationCodePassExam = $cur.education[0].educationCodePassExam
      univercity = $cur.education[0].univercity; passingYear = $cur.education[0].passingYear
      percentage = $cur.education[0].percentage; qualificationTypeCode = $cur.education[0].qualificationTypeCode
      educationStatusCode = $cur.education[0].educationStatusCode
    })
  $p.documents = @(
    @{ empDocumentCode = $cur.documents[0].empDocumentCode; empDocumentPath = $cur.documents[0].empDocumentPath },
    @{ empDocumentCode = $cur.documents[1].empDocumentCode; empDocumentPath = $cur.documents[1].empDocumentPath }
  )
  $p.schools = @(
    @{
      srNo = 1; orgID = $cur.schools[0].orgID; schoolCode = $cur.schools[0].schoolCode
      designationCode = $cur.schools[0].designationCode; teachClass = $cur.schools[0].teachClass
      teachSubject = $cur.schools[0].teachSubject; schoolJoiningDate = '2019-07-01'
      zpTransferOrderNoAndDate = $cur.schools[0].zpTransferOrderNoAndDate
    },
    @{
      srNo = 2; orgID = $org2.orgID; schoolCode = $org2.schoolCode; designationCode = $lk.designations[0].code
      teachClass = '5'; teachSubject = 'English'; schoolJoiningDate = '2015-06-01'
      zpTransferOrderNoAndDate = 'ZP/PRIOR/2015'
    }
  )
  Save-Employee $p | Out-Null
  $loaded = Get-Employee $script:UserId
  $pass = $loaded.schools.Count -eq 2 -and $loaded.schools[1].teachSubject -eq 'English'
  Add-Result 'T8 Add 2nd school row' $pass "count=$($loaded.schools.Count) row2=$($loaded.schools[1].teachSubject)"
}
catch { Add-Result 'T8 Add 2nd school row' $false $_.Exception.Message }

# --- T9: Round-trip (simulate UI: GET -> POST same payload -> GET) ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.firstname = $cur.firstname
  $p.education = @($cur.education | ForEach-Object {
    @{
      srNo = $_.srNo; educationCodePassExam = $_.educationCodePassExam; univercity = $_.univercity
      passingYear = $_.passingYear; percentage = $_.percentage
      qualificationTypeCode = $_.qualificationTypeCode; educationStatusCode = $_.educationStatusCode
    }
  })
  $p.documents = @($cur.documents | ForEach-Object {
    @{ empDocumentCode = $_.empDocumentCode; empDocumentPath = $_.empDocumentPath }
  })
  $p.schools = @($cur.schools | ForEach-Object {
    @{
      srNo = $_.srNo; orgID = $_.orgID; schoolCode = $_.schoolCode; designationCode = $_.designationCode
      teachClass = $_.teachClass; teachSubject = $_.teachSubject
      schoolJoiningDate = Format-DateOnly $_.schoolJoiningDate
      schoolLeaveDate = Format-DateOnly $_.schoolLeaveDate
      sansthaTransferOrderNoAndDate = $_.sansthaTransferOrderNoAndDate
      zpTransferOrderNoAndDate = $_.zpTransferOrderNoAndDate
    }
  })
  Save-Employee $p | Out-Null
  $after = Get-Employee $script:UserId
  $pass = $after.education.Count -eq $cur.education.Count -and $after.documents.Count -eq $cur.documents.Count -and $after.schools.Count -eq $cur.schools.Count
  Add-Result 'T9 Round-trip save (no data loss)' $pass "edu=$($after.education.Count) doc=$($after.documents.Count) sch=$($after.schools.Count)"
}
catch { Add-Result 'T9 Round-trip save (no data loss)' $false $_.Exception.Message }

# --- T10: Second edit visit (user returns later) ---
try {
  $cur = Get-Employee $script:UserId
  $p = New-BasePayload $script:UserId
  $p.remark = 'Second edit visit'
  $p.education = @(@{
      srNo = 1; educationCodePassExam = $cur.education[0].educationCodePassExam
      univercity = 'HC University SECOND VISIT'; passingYear = $cur.education[0].passingYear
      percentage = '88'; qualificationTypeCode = $cur.education[0].qualificationTypeCode
      educationStatusCode = $cur.education[0].educationStatusCode
    })
  $p.documents = @($cur.documents | ForEach-Object {
    @{ empDocumentCode = $_.empDocumentCode; empDocumentPath = $_.empDocumentPath }
  })
  $p.schools = @($cur.schools | ForEach-Object {
    @{
      srNo = $_.srNo; orgID = $_.orgID; schoolCode = $_.schoolCode; designationCode = $_.designationCode
      teachClass = $_.teachClass; teachSubject = $_.teachSubject
      schoolJoiningDate = Format-DateOnly $_.schoolJoiningDate
      zpTransferOrderNoAndDate = $_.zpTransferOrderNoAndDate
    }
  })
  Save-Employee $p | Out-Null
  $loaded = Get-Employee $script:UserId
  $pass = $loaded.education[0].univercity -eq 'HC University SECOND VISIT' -and $loaded.documents.Count -eq $cur.documents.Count -and $loaded.schools.Count -eq $cur.schools.Count
  Add-Result 'T10 Second edit visit' $pass "uni=$($loaded.education[0].univercity) docs=$($loaded.documents.Count)"
}
catch { Add-Result 'T10 Second edit visit' $false $_.Exception.Message }

# --- Summary ---
Write-Host ''
$Results | Format-Table -AutoSize -Wrap
$fail = @($Results | Where-Object Status -eq 'FAIL').Count
$total = $Results.Count
Write-Host "SUMMARY: $total tests, $($total - $fail) passed, $fail failed"
Write-Host "Hardcoded test employee UserID=$($script:UserId) Mobile=$($Config.TestMobile) OrgID=$($Config.OrgID)"
Write-Host "Open https://smartepr.web.app/staff and search $($Config.TestMobile)"
if ($fail -gt 0) { exit 1 }
