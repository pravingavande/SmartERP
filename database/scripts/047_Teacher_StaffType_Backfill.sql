-- Backfill StaffTypeID for legacy UserMaster rows (live data had NULL for all users).
-- Teachers: StaffTypeID = 2. Remaining users: StaffTypeID = 1 (Employee).
-- Also align sp_Employee_GetList to exclude teachers from /staff list.

USE SmartERP;
GO

/* Mark legacy teacher rows (subject / qualification fields populated) */
UPDATE um
SET um.StaffTypeID = 2
FROM dbo.UserMaster um
WHERE um.StaffTypeID IS NULL
  AND (
      NULLIF(LTRIM(RTRIM(um.SubjectName1)), N'') IS NOT NULL
      OR NULLIF(LTRIM(RTRIM(um.SubjectName2)), N'') IS NOT NULL
      OR NULLIF(LTRIM(RTRIM(um.SubjectName3)), N'') IS NOT NULL
      OR NULLIF(LTRIM(RTRIM(um.SQualification)), N'') IS NOT NULL
      OR NULLIF(LTRIM(RTRIM(um.BQualification)), N'') IS NOT NULL
      OR NULLIF(LTRIM(RTRIM(um.AfterDegreePassedSubjects)), N'') IS NOT NULL
  );

/* Remaining users are employees */
UPDATE dbo.UserMaster
SET StaffTypeID = 1
WHERE StaffTypeID IS NULL;
GO

/* Employee list: show employees only (not teachers) */
CREATE OR ALTER PROCEDURE dbo.sp_Employee_GetList
    @OrgID BIGINT = NULL,
    @Search NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.EmployeeName,
        um.EmployeeShortName,
        um.MobileNo1,
        um.OrgID,
        om.OrganizationName,
        um.DesignationID AS DesignationCode,
        dm.DesignationName,
        um.UserRoleID,
        ur.UserRoleName,
        um.IsActive
    FROM dbo.UserMaster um
    LEFT JOIN dbo.OrgMaster om
        ON om.OrgID = um.OrgID
       AND ISNULL(om.IsActive, 1) = 1
    LEFT JOIN dbo.DesignationMaster dm
        ON dm.DesignationID = um.DesignationID
    LEFT JOIN dbo.UserRoleMaster ur
        ON ur.UserRoleID = um.UserRoleID
    WHERE um.IsActive = 1
      AND ISNULL(um.StaffTypeID, 1) = 1
      AND (@OrgID IS NULL OR um.OrgID = @OrgID)
      AND (
          @Search IS NULL
          OR @Search = ''
          OR um.Firstname LIKE '%' + @Search + '%'
          OR um.LastName LIKE '%' + @Search + '%'
          OR um.EmployeeName LIKE '%' + @Search + '%'
          OR um.EmployeeShortName LIKE '%' + @Search + '%'
          OR um.MobileNo1 LIKE '%' + @Search + '%'
          OR um.AppUserName LIKE '%' + @Search + '%'
      )
    ORDER BY um.Firstname, um.LastName, um.UserID;
END
GO

PRINT 'StaffTypeID backfill complete.';
GO
