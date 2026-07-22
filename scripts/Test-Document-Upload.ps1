# Test document upload + DB save for Teacher and Organization
$ErrorActionPreference = 'Stop'
$base = if ($env:SMARTERP_API_BASE) { $env:SMARTERP_API_BASE } else { 'https://smarterp.pathsoft.in/api' }

function Invoke-ApiJson($Method, $Path, $Body = $null, $Headers = @{}) {
    $uri = if ($Path.StartsWith('http')) { $Path } else { "$base$Path" }
    $params = @{ Uri = $uri; Method = $Method; Headers = $Headers; ContentType = 'application/json' }
    if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
    return Invoke-RestMethod @params
}

$login = Invoke-ApiJson POST '/auth/login' @{ userName = '9423150066'; password = '9423150066' }
if (-not $login.success) { throw $login.message }
$headers = @{ Authorization = "Bearer $($login.data.token)" }
Write-Host "Logged in as userId=$($login.data.userId)" -ForegroundColor Cyan

# ---------- TEACHER DOCUMENT TEST ----------
Write-Host "`n=== TEACHER DOCUMENT UPLOAD ===" -ForegroundColor Yellow
$lookups = Invoke-ApiJson GET '/teacher/lookups' $null $headers
$orgId = $lookups.data.orgs[0].orgID
$docCode = ($lookups.data.lookups.documents | Where-Object { $_.code -gt 0 } | Select-Object -First 1).code
$gender = $lookups.data.lookups.genders[0].code
$agid = ($lookups.data.lookups.agids | Select-Object -First 1).code
$religion = ($lookups.data.lookups.religions | Select-Object -First 1).code
$category = ($lookups.data.lookups.categories | Select-Object -First 1).code
$blood = ($lookups.data.lookups.bloodGroups | Select-Object -First 1).code
$jt = ($lookups.data.lookups.jtCategories | Select-Object -First 1).code
$shift = ($lookups.data.lookups.shifts | Select-Object -First 1).code
Write-Host "orgId=$orgId docCode=$docCode"

$mobile = "9$((Get-Random -Minimum 100000000 -Maximum 999999999))"
$created = Invoke-ApiJson POST '/teacher' @{
    userID = 0; orgID = $orgId; staffTypeID = 2; userRoleID = 2; designationCode = 1
    firstname = 'DocTest'; lastName = 'Auto'; mobileNo1 = $mobile; genderCode = $gender
    agid = $agid; religionID = $religion; categoryID = $category; bloodGroupID = $blood
    jtCategoryID = $jt; shiftID = $shift
    isActive = $true; documents = @(); schools = @()
} $headers
if (-not $created.success) { throw "Teacher create failed: $($created.message)" }
$teacherId = $created.data.userID
Write-Host "Teacher created userID=$teacherId"

$tmp = [System.IO.Path]::GetTempFileName() + '.pdf'
[System.IO.File]::WriteAllBytes($tmp, [byte[]](0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A))
try {
    $uploadUri = "$base/teacher/upload-document?orgId=$orgId"
    $upload = Invoke-RestMethod -Uri $uploadUri -Method POST -Headers $headers -Form @{ file = Get-Item $tmp }
    Write-Host "Upload success=$($upload.success) path=$($upload.data) msg=$($upload.message)"
    if (-not $upload.success) { throw $upload.message }
    $path = $upload.data

    $saved = Invoke-ApiJson POST "/teacher/$teacherId/documents" @(
        @{ empDocumentCode = $docCode; empDocumentPath = $path }
    ) $headers
    Write-Host "Save docs success=$($saved.success) docCount=$($saved.data.documents.Count) msg=$($saved.message)"
    if (-not $saved.success) { throw $saved.message }
    if (-not $docCode) { Write-Host 'WARN: No document types in lookups - skipping save verification' -ForegroundColor Yellow; return }

    $got = Invoke-ApiJson GET "/teacher/$teacherId" $null $headers
    $docPath = $got.data.documents[0].empDocumentPath
    Write-Host "Reloaded doc path=$docPath"

    $downloadUri = "$base/teacher/document/$([uri]::EscapeDataString($docPath))"
    $dl = Invoke-WebRequest -Uri $downloadUri -Headers $headers -Method GET
    Write-Host "Download status=$($dl.StatusCode) bytes=$($dl.RawContentLength)"
    if ($dl.StatusCode -ne 200) { throw 'Download failed' }
    Write-Host 'TEACHER DOCUMENT TEST: PASS' -ForegroundColor Green
}
finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
    if ($teacherId) {
        Invoke-ApiJson DELETE "/teacher/$teacherId" $null $headers | Out-Null
    }
}

# ---------- ORGANIZATION DOCUMENT TEST ----------
Write-Host "`n=== ORGANIZATION DOCUMENT UPLOAD ===" -ForegroundColor Yellow
$orgLookups = Invoke-ApiJson GET '/organization/lookups' $null $headers
$sansthaId = ($orgLookups.data.sansthaOrgs | Select-Object -First 1).orgID
if (-not $sansthaId) { $sansthaId = ($orgLookups.data.orgs | Select-Object -First 1).orgID }
$schoolCat = ($orgLookups.data.schoolCategories | Where-Object { $_.id -gt 0 } | Select-Object -First 1).id
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$orgName = "DOC-TEST-$stamp"

$orgCreated = Invoke-ApiJson POST '/organization' @{
    orgID = 0; businessCategoryID = 2; underOrgID = $sansthaId; schoolCategoryID = $schoolCat
    organizationName = $orgName; cityName = 'TestCity'; mobileNo = '9876543210'
    isActive = $true; documents = @()
} $headers
if (-not $orgCreated.success) { throw "Org create failed: $($orgCreated.message)" }
$orgMasterId = $orgCreated.data.orgID
Write-Host "Org created orgID=$orgMasterId"

$docOpts = Invoke-ApiJson GET "/organization/documents?businessCategoryId=2&underOrgId=$sansthaId" $null $headers
$docId = $docOpts.data[0].documentID
Write-Host "documentID=$docId"

$tmp2 = [System.IO.Path]::GetTempFileName() + '.pdf'
[System.IO.File]::WriteAllBytes($tmp2, [byte[]](0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A))
try {
    $uploadUri = "$base/organization/upload?orgId=$orgMasterId&documentId=$docId"
    $upload = Invoke-RestMethod -Uri $uploadUri -Method POST -Headers $headers -Form @{ file = Get-Item $tmp2 }
    Write-Host "Upload success=$($upload.success) path=$($upload.data) msg=$($upload.message)"
    if (-not $upload.success) { throw $upload.message }
    $path = $upload.data

    $saved = Invoke-ApiJson POST "/organization/$orgMasterId/documents" @(
        @{ documentID = $docId; documentPath = $path }
    ) $headers
    Write-Host "Save docs success=$($saved.success) docCount=$($saved.data.documents.Count) msg=$($saved.message)"
    if (-not $saved.success) { throw $saved.message }

    $got = Invoke-ApiJson GET "/organization/$orgMasterId" $null $headers
    $docPath = $got.data.documents[0].documentPath
    Write-Host "Reloaded doc path=$docPath"

    $downloadUri = "$base/organization/file/$([uri]::EscapeDataString($docPath))"
    $dl = Invoke-WebRequest -Uri $downloadUri -Headers $headers -Method GET
    Write-Host "Download status=$($dl.StatusCode) bytes=$($dl.RawContentLength)"
    if ($dl.StatusCode -ne 200) { throw 'Download failed' }
    Write-Host 'ORGANIZATION DOCUMENT TEST: PASS' -ForegroundColor Green
}
finally {
    Remove-Item $tmp2 -ErrorAction SilentlyContinue
    if ($orgMasterId) {
        Invoke-ApiJson DELETE "/organization/$orgMasterId" $null $headers | Out-Null
    }
}

Write-Host "`nAll document upload tests passed." -ForegroundColor Green
