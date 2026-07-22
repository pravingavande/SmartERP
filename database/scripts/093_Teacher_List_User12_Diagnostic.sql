-- Diagnostic: why UserMaster.UserID = 12 does not appear on /teacher-master list
-- Teacher list uses dbo.sp_Teacher_GetList (script 048_Teacher_Staff_Same_Table_Fix.sql)
SET NOCOUNT ON;

DECLARE @UserID BIGINT = 12;

PRINT '=== UserMaster row ===';
SELECT
    um.UserID,
    um.AppUserName,
    um.EmployeeName,
    um.OrgID,
    om.OrganizationName,
    um.StaffTypeID,
    st.StaffTypeName,
    um.UserRoleID,
    ur.UserRoleName,
    um.IsActive,
    um.SubjectName1,
    um.SubjectName2,
    um.SubjectName3,
    um.SQualification,
    um.BQualification
FROM dbo.UserMaster um
LEFT JOIN dbo.OrgMaster om ON om.OrgID = um.OrgID
LEFT JOIN dbo.StaffTypeMaster st ON st.StaffTypeID = um.StaffTypeID
LEFT JOIN dbo.UserRoleMaster ur ON ur.UserRoleID = um.UserRoleID
WHERE um.UserID = @UserID;

PRINT '';
PRINT '=== Teacher list eligibility (sp_Teacher_GetList WHERE logic) ===';
SELECT
    um.UserID,
    CASE WHEN um.StaffTypeID = 2 THEN 1 ELSE 0 END AS Pass_StaffTypeIsTeacher,
    CASE
        WHEN um.StaffTypeID IS NULL
         AND (
             NULLIF(LTRIM(RTRIM(um.SubjectName1)), N'') IS NOT NULL
             OR NULLIF(LTRIM(RTRIM(um.SubjectName2)), N'') IS NOT NULL
             OR NULLIF(LTRIM(RTRIM(um.SubjectName3)), N'') IS NOT NULL
             OR NULLIF(LTRIM(RTRIM(um.SQualification)), N'') IS NOT NULL
             OR NULLIF(LTRIM(RTRIM(um.BQualification)), N'') IS NOT NULL
         ) THEN 1
        ELSE 0
    END AS Pass_LegacyTeacherFields,
    CASE
        WHEN um.StaffTypeID = 2
          OR (
              um.StaffTypeID IS NULL
              AND (
                  NULLIF(LTRIM(RTRIM(um.SubjectName1)), N'') IS NOT NULL
                  OR NULLIF(LTRIM(RTRIM(um.SubjectName2)), N'') IS NOT NULL
                  OR NULLIF(LTRIM(RTRIM(um.SubjectName3)), N'') IS NOT NULL
                  OR NULLIF(LTRIM(RTRIM(um.SQualification)), N'') IS NOT NULL
                  OR NULLIF(LTRIM(RTRIM(um.BQualification)), N'') IS NOT NULL
              )
          ) THEN N'YES — appears on Teacher Master'
        ELSE N'NO — excluded from Teacher Master (shows on /staff only)'
    END AS InTeacherList
FROM dbo.UserMaster um
WHERE um.UserID = @UserID;

PRINT '';
PRINT '=== Would sp_Teacher_GetList return this user? (isActive=true, no org filter) ===';
EXEC dbo.sp_Teacher_GetList
    @OrgID = NULL,
    @Search = NULL,
    @ShalarthID = NULL,
    @MobileNo = NULL,
    @DesignationCode = NULL,
    @Subject = NULL,
    @UserRoleID = NULL,
    @IsActive = 1;

PRINT '';
PRINT '=== Fix (only if this user should be a Teacher) ===';
PRINT 'UPDATE dbo.UserMaster SET StaffTypeID = 2 WHERE UserID = 12 AND StaffTypeID <> 2;';
GO
