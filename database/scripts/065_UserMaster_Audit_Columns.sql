-- ============================================================
-- UserMaster audit fields only
-- Rename CreatedAt → CreatedDate (if needed)
-- Ensure: CreatedDate, ModifiedDate, CreatedUserID, ModifiedUserID
-- Wire insert/update in Employee/Teacher UserMaster save SPs
-- ============================================================
SET NOCOUNT ON;
GO

/* ---------- Schema ---------- */
IF COL_LENGTH('dbo.UserMaster', 'CreatedAt') IS NOT NULL
   AND COL_LENGTH('dbo.UserMaster', 'CreatedDate') IS NULL
BEGIN
    EXEC sp_rename 'dbo.UserMaster.CreatedAt', 'CreatedDate', 'COLUMN';
    PRINT 'Renamed UserMaster.CreatedAt → CreatedDate';
END
GO

IF COL_LENGTH('dbo.UserMaster', 'CreatedDate') IS NULL
BEGIN
    ALTER TABLE dbo.UserMaster ADD CreatedDate DATETIME NULL;
    PRINT 'Added UserMaster.CreatedDate';
END
GO

IF COL_LENGTH('dbo.UserMaster', 'ModifiedDate') IS NULL
BEGIN
    ALTER TABLE dbo.UserMaster ADD ModifiedDate DATETIME NULL;
    PRINT 'Added UserMaster.ModifiedDate';
END
GO

IF COL_LENGTH('dbo.UserMaster', 'CreatedUserID') IS NULL
BEGIN
    ALTER TABLE dbo.UserMaster ADD CreatedUserID BIGINT NULL;
    PRINT 'Added UserMaster.CreatedUserID';
END
GO

IF COL_LENGTH('dbo.UserMaster', 'ModifiedUserID') IS NULL
BEGIN
    ALTER TABLE dbo.UserMaster ADD ModifiedUserID BIGINT NULL;
    PRINT 'Added UserMaster.ModifiedUserID';
END
GO

/* ---------- GetById: return audit columns ---------- */
CREATE OR ALTER PROCEDURE dbo.sp_Employee_GetById
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        um.OrgID,
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
        um.AppUserName,
        CAST(NULL AS VARCHAR(50)) AS AppPassword,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(ISNULL(CAST(um.CloseFlag AS NVARCHAR(20)), N'')))) IN (N'1', N'Y', N'TRUE', N'T')
            THEN 1 ELSE 0 END AS BIT) AS CloseFlag,
        um.IsActive,
        um.CreatedDate,
        um.ModifiedDate,
        um.CreatedUserID,
        um.ModifiedUserID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID;
END
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
        um.JTCategoryID,
        um.PaymentGradeDate,
        um.NivadGradeDate,
        um.RetirementYear,
        um.ServiceOutDate,
        um.ShiftID,
        um.AppUserName,
        CAST(NULL AS VARCHAR(50)) AS AppPassword,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(ISNULL(CAST(um.CloseFlag AS NVARCHAR(20)), N'')))) IN (N'1', N'Y', N'TRUE', N'T')
            THEN 1 ELSE 0 END AS BIT) AS CloseFlag,
        um.IsActive,
        um.CreatedDate,
        um.ModifiedDate,
        um.CreatedUserID,
        um.ModifiedUserID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND (
            um.StaffTypeID = 2
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
END
GO

PRINT '065 schema + GetById applied. Save SPs patched by deploy helper.';
GO
