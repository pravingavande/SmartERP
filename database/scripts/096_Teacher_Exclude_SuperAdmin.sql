-- Exclude App SuperAdmin (UserRoleMaster.SuperAdmin, typically UserRoleID = 5) from Teacher Master list.
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_GetList
    @OrgID BIGINT = NULL,
    @Search NVARCHAR(100) = NULL,
    @ShalarthID NVARCHAR(50) = NULL,
    @MobileNo NVARCHAR(50) = NULL,
    @DesignationCode BIGINT = NULL,
    @Subject NVARCHAR(200) = NULL,
    @UserRoleID INT = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.SrNo,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.EmployeeName,
        um.EmployeeShortName,
        um.MobileNo1,
        um.ShalarthID,
        um.OrgID,
        om.OrganizationName,
        um.DesignationID AS DesignationCode,
        dm.DesignationName,
        um.UserRoleID,
        ur.UserRoleName,
        um.StaffTypeID,
        st.StaffTypeName,
        um.SubjectName1,
        um.SubjectName2,
        um.SubjectName3,
        um.IsActive,
        um.PhotoPath
    FROM dbo.UserMaster um
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = um.OrgID AND ISNULL(om.IsActive, 1) = 1
    LEFT JOIN dbo.DesignationMaster dm ON dm.DesignationID = um.DesignationID
    LEFT JOIN dbo.UserRoleMaster ur ON ur.UserRoleID = um.UserRoleID
    LEFT JOIN dbo.StaffTypeMaster st ON st.StaffTypeID = um.StaffTypeID
    WHERE (
            um.StaffTypeID IN (1, 2)
            OR (
                um.StaffTypeID IS NULL
                AND (
                    NULLIF(LTRIM(RTRIM(um.SubjectName1)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(um.SubjectName2)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(um.SubjectName3)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(um.SQualification)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(um.BQualification)), N'') IS NOT NULL
                )
            )
        )
      AND ISNULL(ur.UserRoleName, N'') <> N'SuperAdmin'
      AND ISNULL(um.UserRoleID, 0) <> 5
      AND (@OrgID IS NULL OR um.OrgID = @OrgID)
      AND (@IsActive IS NULL OR um.IsActive = @IsActive)
      AND (@DesignationCode IS NULL OR um.DesignationID = @DesignationCode)
      AND (@UserRoleID IS NULL OR um.UserRoleID = @UserRoleID)
      AND (@ShalarthID IS NULL OR @ShalarthID = '' OR um.ShalarthID LIKE '%' + @ShalarthID + '%')
      AND (@MobileNo IS NULL OR @MobileNo = '' OR um.MobileNo1 LIKE '%' + @MobileNo + '%')
      AND (
          @Subject IS NULL OR @Subject = ''
          OR um.SubjectName1 LIKE '%' + @Subject + '%'
          OR um.SubjectName2 LIKE '%' + @Subject + '%'
          OR um.SubjectName3 LIKE '%' + @Subject + '%'
      )
      AND (
          @Search IS NULL OR @Search = ''
          OR um.Firstname LIKE '%' + @Search + '%'
          OR um.MiddleName LIKE '%' + @Search + '%'
          OR um.LastName LIKE '%' + @Search + '%'
          OR um.EmployeeName LIKE '%' + @Search + '%'
          OR um.EmployeeShortName LIKE '%' + @Search + '%'
          OR um.AppUserName LIKE '%' + @Search + '%'
      )
    ORDER BY um.OrgID, um.SrNo, um.Firstname, um.LastName;
END
GO

PRINT '096_Teacher_Exclude_SuperAdmin applied.';
GO
