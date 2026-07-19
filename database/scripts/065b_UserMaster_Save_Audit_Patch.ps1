$ErrorActionPreference = 'Stop'
$server = '157.20.211.118,1433'
$db = 'SmartERP'
$user = 'ePathSoftIndiaValid22011994User'
$pass = 'ePathSoftIndiaValid22011994'

function Get-Def([string]$name) {
  $tmp = Join-Path $env:TEMP "def_$name.txt"
  & sqlcmd -S $server -d $db -U $user -P $pass -C -y 0 -Q "SET NOCOUNT ON; SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.$name'));" -o $tmp | Out-Null
  $text = Get-Content $tmp -Raw
  return (($text -replace '\(\d+ rows affected\)', '').Trim())
}

function Apply-Def([string]$name, [string]$sql) {
  $tmp = Join-Path $env:TEMP "patch_$name.sql"
  [System.IO.File]::WriteAllText($tmp, $sql + "`r`nGO`r`n")
  & sqlcmd -S $server -d $db -U $user -P $pass -C -i $tmp
}

# ---- Employee Save ----
$sql = Get-Def 'sp_Employee_Save'
$sql = [regex]::Replace($sql, 'CREATE\s+PROCEDURE', 'CREATE OR ALTER PROCEDURE')
if ($sql -notmatch '@ActorUserID') {
  $sql = $sql.Replace(
    '@SchoolsJson NVARCHAR(MAX) = NULL',
    "@SchoolsJson NVARCHAR(MAX) = NULL,`r`n    @ActorUserID BIGINT = NULL")
}

$sql = $sql.Replace(
  "AppPassword,`r`n            IsActive`r`n        )`r`n        VALUES (",
  "AppPassword,`r`n            IsActive,`r`n            CreatedDate,`r`n            CreatedUserID,`r`n            ModifiedDate,`r`n            ModifiedUserID`r`n        )`r`n        VALUES (")
$sql = $sql.Replace(
  "AppPassword,`n            IsActive`n        )`n        VALUES (",
  "AppPassword,`n            IsActive,`n            CreatedDate,`n            CreatedUserID,`n            ModifiedDate,`n            ModifiedUserID`n        )`n        VALUES (")

$sql = $sql.Replace(
  "@AppPassword,`r`n            @IsActive`r`n        );`r`n`r`n        SET @UserID = SCOPE_IDENTITY();",
  "@AppPassword,`r`n            @IsActive,`r`n            GETDATE(),`r`n            @ActorUserID,`r`n            GETDATE(),`r`n            @ActorUserID`r`n        );`r`n`r`n        SET @UserID = SCOPE_IDENTITY();")
$sql = $sql.Replace(
  "@AppPassword,`n            @IsActive`n        );`n`n        SET @UserID = SCOPE_IDENTITY();",
  "@AppPassword,`n            @IsActive,`n            GETDATE(),`n            @ActorUserID,`n            GETDATE(),`n            @ActorUserID`n        );`n`n        SET @UserID = SCOPE_IDENTITY();")

$sql = $sql.Replace(
  "AppPassword = @AppPassword,`r`n            IsActive = @IsActive`r`n        WHERE UserID = @UserID;",
  "AppPassword = @AppPassword,`r`n            IsActive = @IsActive,`r`n            ModifiedDate = GETDATE(),`r`n            ModifiedUserID = @ActorUserID`r`n        WHERE UserID = @UserID;")
$sql = $sql.Replace(
  "AppPassword = @AppPassword,`n            IsActive = @IsActive`n        WHERE UserID = @UserID;",
  "AppPassword = @AppPassword,`n            IsActive = @IsActive,`n            ModifiedDate = GETDATE(),`n            ModifiedUserID = @ActorUserID`n        WHERE UserID = @UserID;")

Write-Host 'Applying sp_Employee_Save...'
Apply-Def 'sp_Employee_Save' $sql

# ---- Teacher Save ----
$sql = Get-Def 'sp_Teacher_Save'
$sql = [regex]::Replace($sql, 'CREATE\s+PROCEDURE', 'CREATE OR ALTER PROCEDURE')
if ($sql -notmatch '@ActorUserID') {
  if ($sql -match '@SchoolsJson NVARCHAR\(MAX\) = NULL') {
    $sql = $sql.Replace(
      '@SchoolsJson NVARCHAR(MAX) = NULL',
      "@SchoolsJson NVARCHAR(MAX) = NULL,`r`n    @ActorUserID BIGINT = NULL")
  } else {
    $sql = $sql.Replace(
      '@UpdatePassword BIT = 0',
      "@UpdatePassword BIT = 0,`r`n    @ActorUserID BIGINT = NULL")
  }
}

$sql = $sql.Replace(
  'AppUserName, AppPassword, CloseFlag, IsActive',
  'AppUserName, AppPassword, CloseFlag, IsActive, CreatedDate, CreatedUserID, ModifiedDate, ModifiedUserID')
$sql = $sql.Replace(
  '@AppUserName, @AppPassword, @CloseFlag, @IsActive',
  '@AppUserName, @AppPassword, @CloseFlag, @IsActive, GETDATE(), @ActorUserID, GETDATE(), @ActorUserID')

$sql = $sql.Replace(
  "CloseFlag = @CloseFlag,`r`n            IsActive = @IsActive`r`n        WHERE UserID = @UserID",
  "CloseFlag = @CloseFlag,`r`n            IsActive = @IsActive,`r`n            ModifiedDate = GETDATE(),`r`n            ModifiedUserID = @ActorUserID`r`n        WHERE UserID = @UserID")
$sql = $sql.Replace(
  "CloseFlag = @CloseFlag,`n            IsActive = @IsActive`n        WHERE UserID = @UserID",
  "CloseFlag = @CloseFlag,`n            IsActive = @IsActive,`n            ModifiedDate = GETDATE(),`n            ModifiedUserID = @ActorUserID`n        WHERE UserID = @UserID")

Write-Host 'Applying sp_Teacher_Save...'
Apply-Def 'sp_Teacher_Save' $sql

& sqlcmd -S $server -d $db -U $user -P $pass -C -Q "SET NOCOUNT ON; SELECT 'Emp' AS ProcName, CASE WHEN OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Employee_Save')) LIKE '%@ActorUserID%' AND OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Employee_Save')) LIKE '%CreatedDate%' THEN 'OK' ELSE 'BAD' END AS Status UNION ALL SELECT 'Tea', CASE WHEN OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Teacher_Save')) LIKE '%@ActorUserID%' AND OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Teacher_Save')) LIKE '%CreatedDate%' THEN 'OK' ELSE 'BAD' END" -W
