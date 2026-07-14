-- UserMaster: EmployeeName (auto First+Middle+Last) and EmployeeShortName (user entry)
-- Applies to Employee Master and Teacher Master save/get procedures.

USE SmartERP;
GO

IF COL_LENGTH('dbo.UserMaster', 'EmployeeName') IS NULL
    ALTER TABLE dbo.UserMaster ADD EmployeeName NVARCHAR(400) NULL;
IF COL_LENGTH('dbo.UserMaster', 'EmployeeShortName') IS NULL
    ALTER TABLE dbo.UserMaster ADD EmployeeShortName NVARCHAR(100) NULL;
GO

UPDATE dbo.UserMaster
SET EmployeeName = LTRIM(RTRIM(
    CONCAT(
        ISNULL(NULLIF(LTRIM(RTRIM(Firstname)), N''), N''),
        CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(MiddleName, N''))), N'') IS NOT NULL
             THEN N' ' + LTRIM(RTRIM(MiddleName)) ELSE N'' END,
        CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(LastName, N''))), N'') IS NOT NULL
             THEN N' ' + LTRIM(RTRIM(LastName)) ELSE N'' END
    )
))
WHERE EmployeeName IS NULL OR LTRIM(RTRIM(EmployeeName)) = N'';
GO

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

CREATE OR ALTER PROCEDURE dbo.sp_Employee_GetById
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        um.UserID,
        CAST(NULL AS BIGINT) AS SchoolCode,
        um.OrgID,
        um.UserRoleID,
        um.DesignationID AS DesignationCode,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.EmployeeName,
        um.EmployeeShortName,
        um.Address AS PermanentAddress,
        CAST(NULL AS NVARCHAR(255)) AS LocalAddress,
        um.GenderID AS GenderCode,
        um.Dob,
        um.AdharCardNo,
        um.MobileNo1,
        um.MobileNo2,
        um.EmailID,
        um.PanNo,
        um.Remark,
        um.AppUserName,
        um.AppPassword,
        um.IsActive
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Employee_Save
    @UserID BIGINT = NULL OUTPUT,
    @SchoolCode BIGINT = NULL,
    @OrgID BIGINT = NULL,
    @UserRoleID INT = NULL,
    @DesignationCode BIGINT = NULL,
    @Firstname NVARCHAR(120) = NULL,
    @MiddleName NVARCHAR(120) = NULL,
    @LastName NVARCHAR(120) = NULL,
    @EmployeeShortName NVARCHAR(100) = NULL,
    @PermanentAddress NVARCHAR(255) = NULL,
    @LocalAddress NVARCHAR(255) = NULL,
    @GenderCode BIGINT = NULL,
    @Dob DATETIME = NULL,
    @AdharCardNo NVARCHAR(50) = NULL,
    @MobileNo1 NVARCHAR(50) = NULL,
    @MobileNo2 NVARCHAR(50) = NULL,
    @EmailID NVARCHAR(50) = NULL,
    @PanNo NVARCHAR(50) = NULL,
    @Remark NVARCHAR(MAX) = NULL,
    @AppUserName VARCHAR(50) = NULL,
    @AppPassword VARCHAR(50) = NULL,
    @IsActive BIT = 1,
    @EducationJson NVARCHAR(MAX) = NULL,
    @DocumentsJson NVARCHAR(MAX) = NULL,
    @SchoolsJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Address NVARCHAR(255) = COALESCE(
        NULLIF(LTRIM(RTRIM(@PermanentAddress)), N''),
        NULLIF(LTRIM(RTRIM(@LocalAddress)), N'')
    );

    DECLARE @EmployeeName NVARCHAR(400) = LTRIM(RTRIM(
        CONCAT(
            ISNULL(NULLIF(LTRIM(RTRIM(@Firstname)), N''), N''),
            CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(@MiddleName, N''))), N'') IS NOT NULL
                 THEN N' ' + LTRIM(RTRIM(@MiddleName)) ELSE N'' END,
            CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(@LastName, N''))), N'') IS NOT NULL
                 THEN N' ' + LTRIM(RTRIM(@LastName)) ELSE N'' END
        )
    ));

    SET @EmployeeShortName = NULLIF(LTRIM(RTRIM(@EmployeeShortName)), N'');

    BEGIN TRANSACTION;

    IF @UserID IS NULL OR @UserID = 0
    BEGIN
        INSERT INTO dbo.UserMaster (
            OrgID,
            UserRoleID,
            DesignationID,
            Firstname,
            MiddleName,
            LastName,
            EmployeeName,
            EmployeeShortName,
            Address,
            GenderID,
            Dob,
            AdharCardNo,
            MobileNo1,
            MobileNo2,
            EmailID,
            PanNo,
            Remark,
            AppUserName,
            AppPassword,
            IsActive,
            CreatedAt
        )
        VALUES (
            @OrgID,
            @UserRoleID,
            @DesignationCode,
            @Firstname,
            @MiddleName,
            @LastName,
            @EmployeeName,
            @EmployeeShortName,
            @Address,
            @GenderCode,
            @Dob,
            @AdharCardNo,
            @MobileNo1,
            @MobileNo2,
            @EmailID,
            @PanNo,
            @Remark,
            @AppUserName,
            @AppPassword,
            @IsActive,
            GETDATE()
        );

        SET @UserID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.UserMaster
        SET
            OrgID = @OrgID,
            UserRoleID = @UserRoleID,
            DesignationID = @DesignationCode,
            Firstname = @Firstname,
            MiddleName = @MiddleName,
            LastName = @LastName,
            EmployeeName = @EmployeeName,
            EmployeeShortName = @EmployeeShortName,
            Address = @Address,
            GenderID = @GenderCode,
            Dob = @Dob,
            AdharCardNo = @AdharCardNo,
            MobileNo1 = @MobileNo1,
            MobileNo2 = @MobileNo2,
            EmailID = @EmailID,
            PanNo = @PanNo,
            Remark = @Remark,
            AppUserName = @AppUserName,
            AppPassword = @AppPassword,
            IsActive = @IsActive
        WHERE UserID = @UserID;
    END

    DELETE FROM dbo.UserDocument WHERE UserID = @UserID;
    DELETE FROM dbo.UserSchool WHERE TID = @UserID;

    IF OBJECT_ID('dbo.UserEducation', 'U') IS NOT NULL
        DELETE FROM dbo.UserEducation WHERE UserID = @UserID;

    IF OBJECT_ID('dbo.UserEducation', 'U') IS NOT NULL
       AND @EducationJson IS NOT NULL
       AND ISJSON(@EducationJson) = 1
    BEGIN
        INSERT INTO dbo.UserEducation (
            UserID, SrNo, EducationCodePassExam, Univercity, PassingYear, Percentage,
            QualificationTypeCode, EducationStatusCode
        )
        SELECT
            @UserID, j.SrNo, j.EducationCodePassExam, j.Univercity, j.PassingYear, j.Percentage,
            j.QualificationTypeCode, j.EducationStatusCode
        FROM OPENJSON(@EducationJson)
        WITH (
            SrNo BIGINT '$.srNo',
            EducationCodePassExam BIGINT '$.educationCodePassExam',
            Univercity NVARCHAR(255) '$.univercity',
            PassingYear NVARCHAR(50) '$.passingYear',
            Percentage NVARCHAR(50) '$.percentage',
            QualificationTypeCode BIGINT '$.qualificationTypeCode',
            EducationStatusCode BIGINT '$.educationStatusCode'
        ) j;
    END

    IF @DocumentsJson IS NOT NULL AND ISJSON(@DocumentsJson) = 1
    BEGIN
        INSERT INTO dbo.UserDocument (UserID, DocumentID, DocumentPath)
        SELECT @UserID, j.EmpDocumentCode, j.EmpDocumentPath
        FROM OPENJSON(@DocumentsJson)
        WITH (
            EmpDocumentCode BIGINT '$.empDocumentCode',
            EmpDocumentPath VARCHAR(255) '$.empDocumentPath'
        ) j
        WHERE j.EmpDocumentCode IS NOT NULL;
    END

    IF @SchoolsJson IS NOT NULL AND ISJSON(@SchoolsJson) = 1
    BEGIN
        INSERT INTO dbo.UserSchool (
            TID, SrNo, OrgID, DesignationID, TeachClass, TeachSubject,
            SchoolJoiningDate, SchoolLeaveDate
        )
        SELECT
            @UserID, j.SrNo, j.OrgID, j.DesignationCode, j.TeachClass, j.TeachSubject,
            j.SchoolJoiningDate, j.SchoolLeaveDate
        FROM OPENJSON(@SchoolsJson)
        WITH (
            SrNo BIGINT '$.srNo',
            OrgID BIGINT '$.orgID',
            DesignationCode BIGINT '$.designationCode',
            TeachClass NVARCHAR(255) '$.teachClass',
            TeachSubject NVARCHAR(255) '$.teachSubject',
            SchoolJoiningDate DATE '$.schoolJoiningDate',
            SchoolLeaveDate DATE '$.schoolLeaveDate'
        ) j;
    END

    COMMIT TRANSACTION;
END
GO

/* ---- Teacher procedures (StaffTypeID = 2) ---- */
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
          OR um.EmployeeName LIKE '%' + @Search + '%'
          OR um.EmployeeShortName LIKE '%' + @Search + '%'
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
        um.CloseFlag,
        um.IsActive,
        um.CreatedAt
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.StaffTypeID = 2;
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
    @EmployeeShortName NVARCHAR(100) = NULL,
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

    DECLARE @EmployeeName NVARCHAR(400) = LTRIM(RTRIM(
        CONCAT(
            ISNULL(NULLIF(LTRIM(RTRIM(@Firstname)), N''), N''),
            CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(@MiddleName, N''))), N'') IS NOT NULL
                 THEN N' ' + LTRIM(RTRIM(@MiddleName)) ELSE N'' END,
            CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(@LastName, N''))), N'') IS NOT NULL
                 THEN N' ' + LTRIM(RTRIM(@LastName)) ELSE N'' END
        )
    ));

    SET @EmployeeShortName = NULLIF(LTRIM(RTRIM(@EmployeeShortName)), N'');

    BEGIN TRANSACTION;

    IF @UserID IS NULL OR @UserID = 0
    BEGIN
        DECLARE @SrNo INT;
        SELECT @SrNo = ISNULL(MAX(um.SrNo), 0) + 1
        FROM dbo.UserMaster um
        WHERE um.OrgID = @OrgID AND um.StaffTypeID = 2;

        INSERT INTO dbo.UserMaster (
            OrgID, StaffTypeID, SrNo, UserRoleID, DesignationID,
            Firstname, MiddleName, LastName, EmployeeName, EmployeeShortName,
            Address, CityName, PhotoPath,
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
            @Firstname, @MiddleName, @LastName, @EmployeeName, @EmployeeShortName,
            @PermanentAddress, @CityName, @PhotoPath,
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
            EmployeeName = @EmployeeName,
            EmployeeShortName = @EmployeeShortName,
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

PRINT 'UserMaster EmployeeName and EmployeeShortName deployed.';
GO
