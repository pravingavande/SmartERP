-- Teacher Master: UserMaster extensions + dedicated stored procedures
-- Differentiates teachers via StaffTypeID = 2 (Teacher). Employee Master SPs remain unchanged.

USE SmartERP;
GO

DECLARE @TeacherStaffTypeID INT = 2;

/* ---- Lookup masters ---- */
IF OBJECT_ID('dbo.StaffTypeMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StaffTypeMaster (
        StaffTypeID INT NOT NULL PRIMARY KEY,
        StaffTypeName NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_StaffTypeMaster_IsActive DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.StaffTypeMaster WHERE StaffTypeID = 1)
    INSERT INTO dbo.StaffTypeMaster (StaffTypeID, StaffTypeName, IsActive) VALUES (1, N'Employee', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.StaffTypeMaster WHERE StaffTypeID = 2)
    INSERT INTO dbo.StaffTypeMaster (StaffTypeID, StaffTypeName, IsActive) VALUES (2, N'Teacher', 1);
GO

IF OBJECT_ID('dbo.ReligionMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReligionMaster (
        ReligionID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ReligionName NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ReligionMaster_IsActive DEFAULT (1)
    );
    INSERT INTO dbo.ReligionMaster (ReligionName) VALUES (N'Hindu'), (N'Muslim'), (N'Christian'), (N'Buddhist'), (N'Jain'), (N'Sikh'), (N'Other');
END
GO

IF OBJECT_ID('dbo.CategoryMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CategoryMaster (
        CategoryID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        CategoryName NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_CategoryMaster_IsActive DEFAULT (1)
    );
    INSERT INTO dbo.CategoryMaster (CategoryName) VALUES (N'Open'), (N'OBC'), (N'SC'), (N'ST'), (N'VJNT'), (N'SBC'), (N'NT');
END
GO

IF OBJECT_ID('dbo.BloodGroupMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BloodGroupMaster (
        BloodGroupID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        BloodGroupName NVARCHAR(10) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_BloodGroupMaster_IsActive DEFAULT (1)
    );
    INSERT INTO dbo.BloodGroupMaster (BloodGroupName) VALUES (N'A+'), (N'A-'), (N'B+'), (N'B-'), (N'AB+'), (N'AB-'), (N'O+'), (N'O-');
END
GO

IF OBJECT_ID('dbo.ShiftMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShiftMaster (
        ShiftID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ShiftName NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ShiftMaster_IsActive DEFAULT (1)
    );
    INSERT INTO dbo.ShiftMaster (ShiftName) VALUES (N'Morning'), (N'Afternoon'), (N'Full Day');
END
GO

/* ---- UserMaster teacher columns ---- */
IF COL_LENGTH('dbo.UserMaster', 'StaffTypeID') IS NULL
    ALTER TABLE dbo.UserMaster ADD StaffTypeID INT NULL;
IF COL_LENGTH('dbo.UserMaster', 'SrNo') IS NULL
    ALTER TABLE dbo.UserMaster ADD SrNo INT NULL;
IF COL_LENGTH('dbo.UserMaster', 'PhotoPath') IS NULL
    ALTER TABLE dbo.UserMaster ADD PhotoPath NVARCHAR(510) NULL;
IF COL_LENGTH('dbo.UserMaster', 'CityName') IS NULL
    ALTER TABLE dbo.UserMaster ADD CityName NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.UserMaster', 'ScaleOfPay') IS NULL
    ALTER TABLE dbo.UserMaster ADD ScaleOfPay NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.UserMaster', 'CasteName') IS NULL
    ALTER TABLE dbo.UserMaster ADD CasteName NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.UserMaster', 'ReligionID') IS NULL
    ALTER TABLE dbo.UserMaster ADD ReligionID INT NULL;
IF COL_LENGTH('dbo.UserMaster', 'CategoryID') IS NULL
    ALTER TABLE dbo.UserMaster ADD CategoryID INT NULL;
IF COL_LENGTH('dbo.UserMaster', 'BloodGroupID') IS NULL
    ALTER TABLE dbo.UserMaster ADD BloodGroupID INT NULL;
IF COL_LENGTH('dbo.UserMaster', 'SubjectName1') IS NULL
    ALTER TABLE dbo.UserMaster ADD SubjectName1 NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.UserMaster', 'SubjectName2') IS NULL
    ALTER TABLE dbo.UserMaster ADD SubjectName2 NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.UserMaster', 'SubjectName3') IS NULL
    ALTER TABLE dbo.UserMaster ADD SubjectName3 NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.UserMaster', 'SQualification') IS NULL
    ALTER TABLE dbo.UserMaster ADD SQualification NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.UserMaster', 'BQualification') IS NULL
    ALTER TABLE dbo.UserMaster ADD BQualification NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.UserMaster', 'AfterDegreePassedSubjects') IS NULL
    ALTER TABLE dbo.UserMaster ADD AfterDegreePassedSubjects NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.UserMaster', 'SansthaOrderNoAndDate') IS NULL
    ALTER TABLE dbo.UserMaster ADD SansthaOrderNoAndDate NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.UserMaster', 'ZPOrderNoAndDate') IS NULL
    ALTER TABLE dbo.UserMaster ADD ZPOrderNoAndDate NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.UserMaster', 'SansthaServiceOrderNoAndDate') IS NULL
    ALTER TABLE dbo.UserMaster ADD SansthaServiceOrderNoAndDate NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.UserMaster', 'ZPServiceOrderNoAndDate') IS NULL
    ALTER TABLE dbo.UserMaster ADD ZPServiceOrderNoAndDate NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.UserMaster', 'DateOfWorkingStart') IS NULL
    ALTER TABLE dbo.UserMaster ADD DateOfWorkingStart DATE NULL;
IF COL_LENGTH('dbo.UserMaster', 'JTCategoryID') IS NULL
    ALTER TABLE dbo.UserMaster ADD JTCategoryID INT NULL;
IF COL_LENGTH('dbo.UserMaster', 'PaymentGradeDate') IS NULL
    ALTER TABLE dbo.UserMaster ADD PaymentGradeDate DATE NULL;
IF COL_LENGTH('dbo.UserMaster', 'NivadGradeDate') IS NULL
    ALTER TABLE dbo.UserMaster ADD NivadGradeDate DATE NULL;
IF COL_LENGTH('dbo.UserMaster', 'RetirementYear') IS NULL
    ALTER TABLE dbo.UserMaster ADD RetirementYear INT NULL;
IF COL_LENGTH('dbo.UserMaster', 'ServiceOutDate') IS NULL
    ALTER TABLE dbo.UserMaster ADD ServiceOutDate DATE NULL;
IF COL_LENGTH('dbo.UserMaster', 'ShiftID') IS NULL
    ALTER TABLE dbo.UserMaster ADD ShiftID INT NULL;
IF COL_LENGTH('dbo.UserMaster', 'CloseFlag') IS NULL
    ALTER TABLE dbo.UserMaster ADD CloseFlag BIT NULL;
IF COL_LENGTH('dbo.UserMaster', 'ShalarthID') IS NULL
    ALTER TABLE dbo.UserMaster ADD ShalarthID NVARCHAR(50) NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_GetLookups
AS
BEGIN
    SET NOCOUNT ON;

    SELECT st.StaffTypeID, st.StaffTypeName
    FROM dbo.StaffTypeMaster st
    WHERE ISNULL(st.IsActive, 1) = 1
    ORDER BY st.StaffTypeName;

    SELECT ur.UserRoleID, ur.UserRoleName
    FROM dbo.UserRoleMaster ur
    WHERE ur.UserRoleID IS NOT NULL
    ORDER BY ur.UserRoleName;

    SELECT dm.DesignationID AS DesignationCode, dm.DesignationName
    FROM dbo.DesignationMaster dm
    WHERE dm.DesignationID IS NOT NULL AND ISNULL(dm.IsActive, 1) = 1
    ORDER BY dm.DesignationName;

    SELECT gm.GenderID AS GenderCode, gm.GenderName
    FROM dbo.GenderMaster gm
    WHERE gm.GenderID IS NOT NULL AND ISNULL(gm.IsActive, 1) = 1
    ORDER BY gm.GenderName;

    SELECT rm.ReligionID, rm.ReligionName
    FROM dbo.ReligionMaster rm
    WHERE ISNULL(rm.IsActive, 1) = 1
    ORDER BY rm.ReligionName;

    SELECT cm.CategoryID, cm.CategoryName
    FROM dbo.CategoryMaster cm
    WHERE ISNULL(cm.IsActive, 1) = 1
    ORDER BY cm.CategoryName;

    SELECT bg.BloodGroupID, bg.BloodGroupName
    FROM dbo.BloodGroupMaster bg
    WHERE ISNULL(bg.IsActive, 1) = 1
    ORDER BY bg.BloodGroupName;

    SELECT sh.ShiftID, sh.ShiftName
    FROM dbo.ShiftMaster sh
    WHERE ISNULL(sh.IsActive, 1) = 1
    ORDER BY sh.ShiftName;
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
    WHERE um.OrgID = @OrgID
      AND um.StaffTypeID = 2;
    SELECT ISNULL(@NextSrNo, 1) AS NextSrNo;
END
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
    WHERE um.StaffTypeID = 2
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
          OR um.AppUserName LIKE '%' + @Search + '%'
      )
    ORDER BY um.OrgID, um.SrNo, um.Firstname, um.LastName;
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
        um.CloseFlag,
        um.IsActive,
        um.CreatedAt
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.StaffTypeID = 2;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_CheckAppUserName
    @AppUserName VARCHAR(50),
    @ExcludeUserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM dbo.UserMaster um
        WHERE um.AppUserName = @AppUserName
          AND (@ExcludeUserID IS NULL OR um.UserID <> @ExcludeUserID)
    ) THEN 1 ELSE 0 END AS IsDuplicate;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_Save
    @UserID BIGINT = NULL OUTPUT,
    @OrgID BIGINT = NULL,
    @StaffTypeID INT = 2,
    @UserRoleID INT = NULL,
    @DesignationCode BIGINT = NULL,
    @Firstname NVARCHAR(120) = NULL,
    @MiddleName NVARCHAR(120) = NULL,
    @LastName NVARCHAR(120) = NULL,
    @PermanentAddress NVARCHAR(255) = NULL,
    @CityName NVARCHAR(100) = NULL,
    @PhotoPath NVARCHAR(510) = NULL,
    @GenderCode BIGINT = NULL,
    @Dob DATETIME = NULL,
    @AdharCardNo NVARCHAR(50) = NULL,
    @ShalarthID NVARCHAR(50) = NULL,
    @ScaleOfPay NVARCHAR(50) = NULL,
    @CasteName NVARCHAR(100) = NULL,
    @ReligionID INT = NULL,
    @CategoryID INT = NULL,
    @BloodGroupID INT = NULL,
    @MobileNo1 NVARCHAR(50) = NULL,
    @MobileNo2 NVARCHAR(50) = NULL,
    @EmailID NVARCHAR(50) = NULL,
    @PanNo NVARCHAR(50) = NULL,
    @Remark NVARCHAR(MAX) = NULL,
    @SubjectName1 NVARCHAR(200) = NULL,
    @SubjectName2 NVARCHAR(200) = NULL,
    @SubjectName3 NVARCHAR(200) = NULL,
    @SQualification NVARCHAR(255) = NULL,
    @BQualification NVARCHAR(255) = NULL,
    @AfterDegreePassedSubjects NVARCHAR(255) = NULL,
    @SansthaOrderNoAndDate NVARCHAR(255) = NULL,
    @ZPOrderNoAndDate NVARCHAR(255) = NULL,
    @SansthaServiceOrderNoAndDate NVARCHAR(255) = NULL,
    @ZPServiceOrderNoAndDate NVARCHAR(255) = NULL,
    @DateOfWorkingStart DATE = NULL,
    @JTCategoryID INT = NULL,
    @PaymentGradeDate DATE = NULL,
    @NivadGradeDate DATE = NULL,
    @RetirementYear INT = NULL,
    @ServiceOutDate DATE = NULL,
    @ShiftID INT = NULL,
    @AppUserName VARCHAR(50) = NULL,
    @AppPassword VARCHAR(50) = NULL,
    @CloseFlag BIT = 0,
    @IsActive BIT = 1,
    @UpdatePassword BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @StaffTypeID IS NULL SET @StaffTypeID = 2;

    BEGIN TRANSACTION;

    IF @UserID IS NULL OR @UserID = 0
    BEGIN
        DECLARE @SrNo INT;
        SELECT @SrNo = ISNULL(MAX(um.SrNo), 0) + 1
        FROM dbo.UserMaster um
        WHERE um.OrgID = @OrgID AND um.StaffTypeID = 2;

        INSERT INTO dbo.UserMaster (
            OrgID, StaffTypeID, SrNo, UserRoleID, DesignationID,
            Firstname, MiddleName, LastName, Address, CityName, PhotoPath,
            GenderID, Dob, AdharCardNo, ShalarthID, ScaleOfPay, CasteName,
            ReligionID, CategoryID, BloodGroupID,
            MobileNo1, MobileNo2, EmailID, PanNo, Remark,
            SubjectName1, SubjectName2, SubjectName3,
            SQualification, BQualification, AfterDegreePassedSubjects,
            SansthaOrderNoAndDate, ZPOrderNoAndDate,
            SansthaServiceOrderNoAndDate, ZPServiceOrderNoAndDate,
            DateOfWorkingStart, JTCategoryID, PaymentGradeDate, NivadGradeDate,
            RetirementYear, ServiceOutDate, ShiftID,
            AppUserName, AppPassword, CloseFlag, IsActive, CreatedAt
        )
        VALUES (
            @OrgID, @StaffTypeID, @SrNo, @UserRoleID, @DesignationCode,
            @Firstname, @MiddleName, @LastName, @PermanentAddress, @CityName, @PhotoPath,
            @GenderCode, @Dob, @AdharCardNo, @ShalarthID, @ScaleOfPay, @CasteName,
            @ReligionID, @CategoryID, @BloodGroupID,
            @MobileNo1, @MobileNo2, @EmailID, @PanNo, @Remark,
            @SubjectName1, @SubjectName2, @SubjectName3,
            @SQualification, @BQualification, @AfterDegreePassedSubjects,
            @SansthaOrderNoAndDate, @ZPOrderNoAndDate,
            @SansthaServiceOrderNoAndDate, @ZPServiceOrderNoAndDate,
            @DateOfWorkingStart, @JTCategoryID, @PaymentGradeDate, @NivadGradeDate,
            @RetirementYear, @ServiceOutDate, @ShiftID,
            @AppUserName, @AppPassword, @CloseFlag, @IsActive, GETDATE()
        );

        SET @UserID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.UserMaster
        SET
            OrgID = @OrgID,
            StaffTypeID = @StaffTypeID,
            UserRoleID = @UserRoleID,
            DesignationID = @DesignationCode,
            Firstname = @Firstname,
            MiddleName = @MiddleName,
            LastName = @LastName,
            Address = @PermanentAddress,
            CityName = @CityName,
            PhotoPath = COALESCE(@PhotoPath, PhotoPath),
            GenderID = @GenderCode,
            Dob = @Dob,
            AdharCardNo = @AdharCardNo,
            ShalarthID = @ShalarthID,
            ScaleOfPay = @ScaleOfPay,
            CasteName = @CasteName,
            ReligionID = @ReligionID,
            CategoryID = @CategoryID,
            BloodGroupID = @BloodGroupID,
            MobileNo1 = @MobileNo1,
            MobileNo2 = @MobileNo2,
            EmailID = @EmailID,
            PanNo = @PanNo,
            Remark = @Remark,
            SubjectName1 = @SubjectName1,
            SubjectName2 = @SubjectName2,
            SubjectName3 = @SubjectName3,
            SQualification = @SQualification,
            BQualification = @BQualification,
            AfterDegreePassedSubjects = @AfterDegreePassedSubjects,
            SansthaOrderNoAndDate = @SansthaOrderNoAndDate,
            ZPOrderNoAndDate = @ZPOrderNoAndDate,
            SansthaServiceOrderNoAndDate = @SansthaServiceOrderNoAndDate,
            ZPServiceOrderNoAndDate = @ZPServiceOrderNoAndDate,
            DateOfWorkingStart = @DateOfWorkingStart,
            JTCategoryID = @JTCategoryID,
            PaymentGradeDate = @PaymentGradeDate,
            NivadGradeDate = @NivadGradeDate,
            RetirementYear = @RetirementYear,
            ServiceOutDate = @ServiceOutDate,
            ShiftID = @ShiftID,
            AppUserName = @AppUserName,
            AppPassword = CASE WHEN @UpdatePassword = 1 AND @AppPassword IS NOT NULL AND @AppPassword <> '' THEN @AppPassword ELSE AppPassword END,
            CloseFlag = @CloseFlag,
            IsActive = @IsActive
        WHERE UserID = @UserID
          AND StaffTypeID = 2;
    END

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_Delete
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.UserMaster
    SET IsActive = 0, CloseFlag = 1
    WHERE UserID = @UserID AND StaffTypeID = 2;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_ResetPassword
    @UserID BIGINT,
    @AppPassword VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.UserMaster
    SET AppPassword = @AppPassword
    WHERE UserID = @UserID AND StaffTypeID = 2;
END
GO

PRINT 'Teacher Master schema and procedures deployed.';
GO
