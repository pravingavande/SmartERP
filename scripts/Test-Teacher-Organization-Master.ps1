# Hardcore CRUD tests: Teacher Master + Organization Master (live API)
# Run: powershell -ExecutionPolicy Bypass -File scripts\Test-Teacher-Organization-Master.ps1

$ErrorActionPreference = 'Stop'
$base = if ($env:SMARTERP_API_BASE) { $env:SMARTERP_API_BASE } else { 'https://smarterp.pathsoft.in/api' }
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$results = [System.Collections.Generic.List[object]]::new()

function Add-Result($Name, $Ok, $Detail) {
    $results.Add([PSCustomObject]@{ Test = $Name; Status = $(if ($Ok) { 'PASS' } else { 'FAIL' }); Detail = $Detail })
    $color = if ($Ok) { 'Green' } else { 'Red' }
    Write-Host "$(if ($Ok){'PASS'}else{'FAIL'}) $Name - $Detail" -ForegroundColor $color
}

function Invoke-ApiJson($Method, $Path, $Body = $null, $Headers = @{}) {
    $uri = if ($Path.StartsWith('http')) { $Path } else { "$base$Path" }
    $params = @{ Uri = $uri; Method = $Method; Headers = $Headers; ContentType = 'application/json' }
    if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
    return Invoke-RestMethod @params
}

# Login
try {
    $login = Invoke-ApiJson POST '/auth/login' @{ userName = '9423150066'; password = '9423150066' }
    if (-not $login.success) { throw $login.message }
    $headers = @{ Authorization = "Bearer $($login.data.token)" }
    Add-Result 'Auth login' $true "userId=$($login.data.userId)"
} catch {
    Add-Result 'Auth login' $false $_.Exception.Message
    $results | Format-Table -AutoSize
    exit 1
}

# ---------- TEACHER MASTER ----------
$teacherId = $null
$teacherMobile = "9$((Get-Random -Minimum 100000000 -Maximum 999999999))"

try {
    $lookups = Invoke-ApiJson GET '/teacher/lookups' $null $headers
    Add-Result 'Teacher GET lookups' $lookups.success "orgs=$($lookups.data.orgs.Count)"
    $orgId = $lookups.data.orgs[0].orgID
} catch {
    Add-Result 'Teacher GET lookups' $false $_.Exception.Message
    $orgId = 4
}

try {
    $listUri = "/teacher?orgID=$orgId" + '&isActive=true'
    $list = Invoke-ApiJson GET $listUri $null $headers
    Add-Result 'Teacher GET list' $list.success "count=$($list.data.Count)"
} catch {
    Add-Result 'Teacher GET list' $false $_.Exception.Message
}

try {
    $gender = $lookups.data.lookups.genders[0].code
    $createBody = @{
        userID = 0
        orgID = $orgId
        staffTypeID = 2
        userRoleID = 2
        designationCode = 1
        firstname = "TestTeacher"
        lastName = "Auto$stamp"
        employeeShortName = "TT$stamp"
        mobileNo1 = $teacherMobile
        genderCode = $gender
        subjectName1 = 'Mathematics'
        sQualification = 'B.Ed'
        isActive = $true
        documents = @()
        schools = @()
    }
    $created = Invoke-ApiJson POST '/teacher' $createBody $headers
    if (-not $created.success) { throw $created.message }
    $teacherId = $created.data.userID
    Add-Result 'Teacher POST add' $true "userID=$teacherId mobile=$teacherMobile"
} catch {
    Add-Result 'Teacher POST add' $false $_.Exception.Message
}

if ($teacherId) {
    try {
        $got = Invoke-ApiJson GET "/teacher/$teacherId" $null $headers
        $ok = $got.success -and $got.data.userID -eq $teacherId
        Add-Result 'Teacher GET by id' $ok "firstname=$($got.data.firstname)"
    } catch {
        Add-Result 'Teacher GET by id' $false $_.Exception.Message
    }

    try {
        $editBody = @{
            userID = $teacherId
            orgID = $orgId
            staffTypeID = 2
            userRoleID = 2
            designationCode = 1
            firstname = 'TestTeacherEdited'
            lastName = "Auto$stamp"
            employeeShortName = "TT$stamp"
            mobileNo1 = $teacherMobile
            genderCode = $gender
            subjectName1 = 'Science'
            subjectName2 = 'Math'
            sQualification = 'M.Ed'
            isActive = $true
            documents = @()
            schools = @()
        }
        $edited = Invoke-ApiJson POST '/teacher' $editBody $headers
        $ok = $edited.success -and $edited.data.subjectName1 -eq 'Science'
        Add-Result 'Teacher POST edit' $ok "subject=$($edited.data.subjectName1)"
    } catch {
        Add-Result 'Teacher POST edit' $false $_.Exception.Message
    }

    try {
        $deleted = Invoke-ApiJson DELETE "/teacher/$teacherId" $null $headers
        Add-Result 'Teacher DELETE deactivate' $deleted.success $deleted.message
    } catch {
        Add-Result 'Teacher DELETE deactivate' $false $_.Exception.Message
    }

    try {
        $after = Invoke-ApiJson GET "/teacher/$teacherId" $null $headers
        $ok = $after.success -and $after.data.isActive -eq $false
        Add-Result 'Teacher verify inactive' $ok "isActive=$($after.data.isActive)"
    } catch {
        Add-Result 'Teacher verify inactive' $false $_.Exception.Message
    }
}

# ---------- ORGANIZATION MASTER ----------
$orgMasterId = $null
$orgName = "TEST-ORG-AUTO-$stamp"

try {
    $orgLookups = Invoke-ApiJson GET '/organization/lookups' $null $headers
    Add-Result 'Org GET lookups' $orgLookups.success "bc=$($orgLookups.data.businessCategories.Count) sanstha=$($orgLookups.data.sansthaOrgs.Count)"
} catch {
    $msg = $_.Exception.Message
    if ($msg -match '404') { $msg += ' (API not deployed to IIS - copy publish/SmartEPR-Api)' }
    Add-Result 'Org GET lookups' $false $msg
}

try {
    $orgList = Invoke-ApiJson GET '/organization?isActive=true' $null $headers
    Add-Result 'Org GET list' $orgList.success "count=$($orgList.data.Count)"
} catch {
    Add-Result 'Org GET list' $false $_.Exception.Message
}

$sansthaId = 3
$schoolCategoryId = 2
try {
    if ($orgLookups.success) {
        $schoolCat = $orgLookups.data.schoolCategories | Where-Object { $_.id -gt 0 } | Select-Object -First 1
        if ($schoolCat) { $schoolCategoryId = $schoolCat.id }
        $sanstha = $orgLookups.data.sansthaOrgs | Select-Object -First 1
        if ($sanstha) { $sansthaId = $sanstha.orgID }
    }
} catch {}

try {
    $createOrg = @{
        orgID = 0
        businessCategoryID = 2
        underOrgID = $sansthaId
        schoolCategoryID = $schoolCategoryId
        organizationName = $orgName
        cityName = 'TestCity'
        mobileNo = '9876543210'
        emailID = "test$stamp@example.com"
        isActive = $true
        documents = @()
    }
    $orgCreated = Invoke-ApiJson POST '/organization' $createOrg $headers
    if (-not $orgCreated.success) { throw $orgCreated.message }
    $orgMasterId = $orgCreated.data.orgID
    Add-Result 'Org POST add school' $true "orgID=$orgMasterId srNo=$($orgCreated.data.srNo)"
} catch {
    Add-Result 'Org POST add school' $false $_.Exception.Message
}

if ($orgMasterId) {
    try {
        $orgGot = Invoke-ApiJson GET "/organization/$orgMasterId" $null $headers
        $ok = $orgGot.success -and $orgGot.data.organizationName -eq $orgName
        Add-Result 'Org GET by id' $ok "name=$($orgGot.data.organizationName)"
    } catch {
        Add-Result 'Org GET by id' $false $_.Exception.Message
    }

    try {
        $editOrg = @{
            orgID = $orgMasterId
            businessCategoryID = 2
            underOrgID = $sansthaId
            schoolCategoryID = $schoolCategoryId
            organizationName = "$orgName-EDITED"
            cityName = 'EditedCity'
            mobileNo = '9876543210'
            emailID = "test$stamp@example.com"
            remark = 'Edited by auto test'
            isActive = $true
            documents = @()
        }
        $orgEdited = Invoke-ApiJson POST '/organization' $editOrg $headers
        $ok = $orgEdited.success -and $orgEdited.data.organizationName -like '*EDITED*'
        Add-Result 'Org POST edit' $ok "name=$($orgEdited.data.organizationName)"
    } catch {
        Add-Result 'Org POST edit' $false $_.Exception.Message
    }

    try {
        $docs = Invoke-ApiJson GET '/organization/documents?businessCategoryId=2' $null $headers
        Add-Result 'Org GET documents by BC' $docs.success "count=$($docs.data.Count)"
    } catch {
        Add-Result 'Org GET documents by BC' $false $_.Exception.Message
    }

    try {
        $deletedOrg = Invoke-ApiJson DELETE "/organization/$orgMasterId" $null $headers
        Add-Result 'Org DELETE deactivate' $deletedOrg.success $deletedOrg.message
    } catch {
        Add-Result 'Org DELETE deactivate' $false $_.Exception.Message
    }

    try {
        $orgAfter = Invoke-ApiJson GET "/organization/$orgMasterId" $null $headers
        $ok = $orgAfter.success -and $orgAfter.data.isActive -eq $false
        Add-Result 'Org verify inactive' $ok "isActive=$($orgAfter.data.isActive)"
    } catch {
        Add-Result 'Org verify inactive' $false $_.Exception.Message
    }
}

# Validation negative tests
try {
    $badOrg = @{ orgID = 0; businessCategoryID = 0; organizationName = ''; schoolCategoryID = 0; isActive = $true; documents = @() }
    $bad = Invoke-ApiJson POST '/organization' $badOrg $headers
    Add-Result 'Org validation reject empty' (-not $bad.success) $bad.message
} catch {
    Add-Result 'Org validation reject empty' $true 'Rejected as expected'
}

Write-Host ''
Write-Host '========== SUMMARY ==========' -ForegroundColor Cyan
$results | Format-Table -AutoSize
$fail = @($results | Where-Object Status -eq 'FAIL').Count
$pass = @($results | Where-Object Status -eq 'PASS').Count
Write-Host "Passed: $pass  Failed: $fail" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
if ($fail -gt 0) { exit 1 }
