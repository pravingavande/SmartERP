-- Editable SrNo on Organization and Teacher save
USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organization_Save
    @OrgID BIGINT = NULL OUTPUT,
    @BusinessCategoryID INT,
    @UnderOrgID BIGINT = NULL,
    @SchoolCategoryID BIGINT = NULL,
    @SrNo BIGINT = NULL,
    @OrganizationName NVARCHAR(255),
    @Address NVARCHAR(500) = NULL,
    @CityName NVARCHAR(100) = NULL,
    @UDiesNo NVARCHAR(50) = NULL,
    @SchoolTinNo NVARCHAR(50) = NULL,
    @SharlarthID NVARCHAR(50) = NULL,
    @PanNo NVARCHAR(50) = NULL,
    @EmailID NVARCHAR(100) = NULL,
    @PhoneNo NVARCHAR(50) = NULL,
    @MobileNo NVARCHAR(50) = NULL,
    @WebSite NVARCHAR(255) = NULL,
    @EstablishmentYear NVARCHAR(10) = NULL,
    @RegNo NVARCHAR(100) = NULL,
    @Permission80G NVARCHAR(100) = NULL,
    @Remark NVARCHAR(MAX) = NULL,
    @IsActive BIT = 1,
    @DocumentsJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @BusinessCategoryID IS NULL OR @BusinessCategoryID <= 0
        THROW 51001, 'Business Category is required.', 1;

    IF @OrganizationName IS NULL OR LTRIM(RTRIM(@OrganizationName)) = ''
        THROW 51002, 'Organization Name is required.', 1;

    IF @SchoolCategoryID IS NULL
        THROW 51003, 'School Category is required.', 1;

    IF @BusinessCategoryID = 2 AND (@UnderOrgID IS NULL OR @UnderOrgID <= 0)
        THROW 51004, 'Under Sanstha is required.', 1;

    BEGIN TRANSACTION;

    DECLARE @ResolvedSrNo BIGINT = @SrNo;

    IF @OrgID IS NULL OR @OrgID = 0
    BEGIN
        IF @BusinessCategoryID = 3
        BEGIN
            SET @UnderOrgID = NULL;
            SET @ResolvedSrNo = ISNULL(@ResolvedSrNo, 0);
        END
        ELSE IF @ResolvedSrNo IS NULL
        BEGIN
            SELECT @ResolvedSrNo = ISNULL(MAX(om.SrNo), 0) + 1
            FROM dbo.OrgMaster om
            WHERE om.UnderOrgID = @UnderOrgID;
        END

        INSERT INTO dbo.OrgMaster (
            BusinessCategoryID, UnderOrgID, SrNo, SchoolCategoryID,
            OrganizationName, Address, CityName, UDiesNo, SchoolTinNo, SharlarthID,
            PanNo, EmailID, PhoneNo, MobileNo, WebSite, EstablishmentYear,
            RegNo, Permission80G, Remark, IsActive
        )
        VALUES (
            @BusinessCategoryID,
            ISNULL(@UnderOrgID, 0),
            ISNULL(@ResolvedSrNo, 1),
            @SchoolCategoryID,
            LTRIM(RTRIM(@OrganizationName)),
            @Address, @CityName, @UDiesNo, @SchoolTinNo, @SharlarthID,
            @PanNo, @EmailID, @PhoneNo, @MobileNo, @WebSite, @EstablishmentYear,
            @RegNo, @Permission80G, @Remark, @IsActive
        );

        SET @OrgID = SCOPE_IDENTITY();

        IF @BusinessCategoryID = 3
        BEGIN
            UPDATE dbo.OrgMaster
            SET UnderOrgID = @OrgID,
                SrNo = ISNULL(SrNo, 0)
            WHERE OrgID = @OrgID;
        END
    END
    ELSE
    BEGIN
        UPDATE dbo.OrgMaster
        SET
            BusinessCategoryID = @BusinessCategoryID,
            UnderOrgID = CASE WHEN @BusinessCategoryID = 3 THEN @OrgID ELSE @UnderOrgID END,
            SrNo = CASE WHEN @ResolvedSrNo IS NOT NULL THEN @ResolvedSrNo ELSE SrNo END,
            SchoolCategoryID = @SchoolCategoryID,
            OrganizationName = LTRIM(RTRIM(@OrganizationName)),
            Address = @Address,
            CityName = @CityName,
            UDiesNo = @UDiesNo,
            SchoolTinNo = @SchoolTinNo,
            SharlarthID = @SharlarthID,
            PanNo = @PanNo,
            EmailID = @EmailID,
            PhoneNo = @PhoneNo,
            MobileNo = @MobileNo,
            WebSite = @WebSite,
            EstablishmentYear = @EstablishmentYear,
            RegNo = @RegNo,
            Permission80G = @Permission80G,
            Remark = @Remark,
            IsActive = @IsActive
        WHERE OrgID = @OrgID;
    END

    DELETE FROM dbo.OrgDocument WHERE OrgID = @OrgID;

    IF @DocumentsJson IS NOT NULL AND ISJSON(@DocumentsJson) = 1
    BEGIN
        INSERT INTO dbo.OrgDocument (OrgID, DocumentID, DocumentPath)
        SELECT @OrgID, j.DocumentID, j.DocumentPath
        FROM OPENJSON(@DocumentsJson)
        WITH (
            DocumentID BIGINT '$.documentID',
            DocumentPath VARCHAR(510) '$.documentPath'
        ) j
        WHERE j.DocumentID IS NOT NULL
          AND NULLIF(LTRIM(RTRIM(j.DocumentPath)), '') IS NOT NULL;
    END

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_Save
    @UserID BIGINT = NULL OUTPUT,
    @OrgID BIGINT = NULL,
    @SrNo INT = NULL,
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
    @UpdatePassword BIT = 0,
    @DocumentsJson NVARCHAR(MAX) = NULL,
    @SchoolsJson NVARCHAR(MAX) = NULL
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
        DECLARE @ResolvedSrNo INT = @SrNo;
        IF @ResolvedSrNo IS NULL
        BEGIN
            SELECT @ResolvedSrNo = ISNULL(MAX(um.SrNo), 0) + 1
            FROM dbo.UserMaster um
            WHERE um.OrgID = @OrgID
              AND (
                    um.StaffTypeID = 2
                    OR (
                        um.StaffTypeID IS NULL
                        AND (
                            NULLIF(LTRIM(RTRIM(um.SubjectName1)), N'') IS NOT NULL
                            OR NULLIF(LTRIM(RTRIM(um.SubjectName2)), N'') IS NOT NULL
                            OR NULLIF(LTRIM(RTRIM(um.SubjectName3)), N'') IS NOT NULL
                        )
                    )
                );
        END

        INSERT INTO dbo.UserMaster (
            OrgID, StaffTypeID, SrNo, UserRoleID, DesignationID,
            Firstname, MiddleName, LastName, EmployeeName, EmployeeShortName,
            Address, CityName, PhotoPath, GenderID, Dob, AdharCardNo, ShalarthID,
            ScaleOfPay, CasteName, ReligionID, CategoryID, BloodGroupID,
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
            @OrgID, @StaffTypeID, ISNULL(@ResolvedSrNo, 1), @UserRoleID, @DesignationCode,
            @Firstname, @MiddleName, @LastName, @EmployeeName, @EmployeeShortName,
            @PermanentAddress, @CityName, @PhotoPath, @GenderCode, @Dob, @AdharCardNo, @ShalarthID,
            @ScaleOfPay, @CasteName, @ReligionID, @CategoryID, @BloodGroupID,
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
            SrNo = CASE WHEN @SrNo IS NOT NULL THEN @SrNo ELSE SrNo END,
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
          AND (
                StaffTypeID = 2
                OR (
                    StaffTypeID IS NULL
                    AND (
                        NULLIF(LTRIM(RTRIM(SubjectName1)), N'') IS NOT NULL
                        OR NULLIF(LTRIM(RTRIM(SubjectName2)), N'') IS NOT NULL
                        OR NULLIF(LTRIM(RTRIM(SubjectName3)), N'') IS NOT NULL
                        OR NULLIF(LTRIM(RTRIM(SQualification)), N'') IS NOT NULL
                        OR NULLIF(LTRIM(RTRIM(BQualification)), N'') IS NOT NULL
                    )
                )
            );
    END

    DELETE FROM dbo.UserDocument WHERE UserID = @UserID;
    DELETE FROM dbo.UserSchool WHERE TID = @UserID;

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

PRINT 'Editable SrNo save procedures deployed.';
GO
