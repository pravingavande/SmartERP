$ErrorActionPreference = 'Continue'
$base = 'https://smarterp.pathsoft.in/api'
$results = New-Object System.Collections.Generic.List[object]

function Add-Result([string]$Name, $Status, [string]$Detail) {
  $Results.Add([pscustomobject]@{ Test = $Name; Status = $Status; Detail = $Detail }) | Out-Null
}

function Invoke-Api {
  param([string]$Name, [string]$Path, [hashtable]$Headers = $null, [string]$Method = 'GET', [object]$Body = $null)
  $uri = "$base$Path"
  try {
    $params = @{ Uri = $uri; Method = $Method; TimeoutSec = 30; UseBasicParsing = $true }
    if ($Headers) { $params.Headers = $Headers }
    if ($Body) {
      $params.Body = ($Body | ConvertTo-Json)
      $params.ContentType = 'application/json'
    }
    $r = Invoke-WebRequest @params
    $text = $r.Content
    if ($text.Length -gt 220) { $text = $text.Substring(0, 220) + '...' }
    Add-Result $Name $r.StatusCode $text
    return $r
  }
  catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'ERR' }
    $detail = $_.Exception.Message
    if ($_.ErrorDetails.Message) {
      $detail = $_.ErrorDetails.Message
      if ($detail.Length -gt 220) { $detail = $detail.Substring(0, 220) + '...' }
    }
    Add-Result $Name $code $detail
    return $null
  }
}

Invoke-Api -Name 'Health' -Path '/health' | Out-Null
Invoke-Api -Name 'Employee (no auth)' -Path '/Employee' | Out-Null
Invoke-Api -Name 'Employee lowercase' -Path '/employee' | Out-Null

$loginBody = @{ userName = '9423150066'; password = '9423150066' }
$login = Invoke-Api -Name 'Login' -Path '/auth/login' -Method POST -Body $loginBody
if ($login) {
  try {
    $json = $login.Content | ConvertFrom-Json
    if ($json.success -and $json.data.token) {
      $h = @{ Authorization = "Bearer $($json.data.token)" }
      Invoke-Api -Name 'Employee list org=13' -Path '/Employee?orgId=13' -Headers $h | Out-Null
      Invoke-Api -Name 'Employee lookups' -Path '/Employee/lookups' -Headers $h | Out-Null
      $list = Invoke-RestMethod -Uri "$base/Employee?orgId=13" -Headers $h -TimeoutSec 30
      Add-Result 'Employee count' 'OK' "success=$($list.success) count=$($list.data.Count)"
    }
    else {
      Add-Result 'Login token' 'FAIL' ($json.message)
    }
  }
  catch {
    Add-Result 'Login parse' 'ERR' $_.Exception.Message
  }
}

Write-Host ''
$results | Format-Table -AutoSize -Wrap
