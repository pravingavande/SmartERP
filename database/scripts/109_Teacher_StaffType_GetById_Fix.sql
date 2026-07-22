-- ============================================================
-- Teacher save: GetById / GetList / GetNextSrNo / Save UPDATE
-- failed for StaffTypeID other than 1 or 2 (e.g. 7 on live).
-- Teacher Master excludes Employee (StaffTypeID = 1) only.
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_GetById
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.SrNo,
        um.OrgID,
        um.StaffTypeID,
        um.UserRoleID,
        um.DesignationID AS DesignationCode,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.EmployeeName,
        um.EmployeeShortName,
        um.Address AS PermanentAddress,
        um.CityName,
        um.PhotoPath,
        um.GenderID AS GenderCode,
        um.Dob,
        um.AdharCardNo,
        um.NationalCode,
        um.AGID,
        um.ShalarthID,
        um.ScaleOfPay,
        um.CasteName,
        um.ReligionID,
        um.CategoryID,
        um.BloodGroupID,
        um.MobileNo1,
        um.MobileNo2,
        um.EmailID,
        um.PanNo,
        um.Remark,
        um.SubjectName1,
        um.SubjectName2,
        um.SubjectName3,
        um.SQualification,
        um.BQualification,
        um.AfterDegreePassedSubjects,
        um.SansthaOrderNoAndDate,
        um.ZPOrderNoAndDate,
        um.SansthaServiceOrderNoAndDate,
        um.ZPServiceOrderNoAndDate,
        um.DateOfWorkingStart,
        um.DoWSCurrentSchool,
        um.JTCategoryID,
        um.PaymentGradeDate,
        um.NivadGradeDate,
        um.RetirementYear,
        um.ServiceOutDate,
        um.ShiftID,
        um.AppUserName,
        um.AppPassword,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(ISNULL(CAST(um.CloseFlag AS NVARCHAR(20)), N'')))) IN (N'1', N'Y', N'TRUE', N'T')
            THEN 1 ELSE 0 END AS BIT) AS CloseFlag,
        um.IsActive,
        um.CreatedDate,
        um.ModifiedDate,
        um.CreatedUserID,
        um.ModifiedUserID
    FROM dbo.UserMaster um
    LEFT JOIN dbo.UserRoleMaster ur ON ur.UserRoleID = um.UserRoleID
    WHERE um.UserID = @UserID
      AND ISNULL(um.UserRoleID, 0) <> 5
      AND ISNULL(ur.UserRoleName, N'') <> N'SuperAdmin';
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_GetNextSrNo
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NextSrNo INT;

    SELECT @NextSrNo = ISNULL(MAX(um.SrNo), 0) + 1
    FROM dbo.UserMaster um
    LEFT JOIN dbo.UserRoleMaster ur ON ur.UserRoleID = um.UserRoleID
    WHERE um.OrgID = @OrgID
      AND ISNULL(um.UserRoleID, 0) <> 5
      AND ISNULL(ur.UserRoleName, N'') <> N'SuperAdmin'
      AND (
            ISNULL(um.StaffTypeID, 0) <> 1
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
        );

    SELECT @NextSrNo AS NextSrNo;
END
GO

-- Patch list filter only (extends 099)
CREATE OR ALTER PROCEDURE dbo.sp_Teacher_GetList
    @OrgID BIGINT = NULL,
    @SansthaID BIGINT = NULL,
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
            ISNULL(um.StaffTypeID, 0) <> 1
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
      AND (
            (@OrgID IS NOT NULL AND um.OrgID = @OrgID)
            OR (
                @OrgID IS NULL
                AND @SansthaID IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM dbo.OrgMaster omScope
                    WHERE omScope.OrgID = um.OrgID
                      AND ISNULL(omScope.IsActive, 1) = 1
                      AND (
                            omScope.OrgID = @SansthaID
                            OR omScope.UnderOrgID = @SansthaID
                          )
                )
            )
          )
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

PRINT '109_Teacher_StaffType_GetById_Fix applied.';
GO
