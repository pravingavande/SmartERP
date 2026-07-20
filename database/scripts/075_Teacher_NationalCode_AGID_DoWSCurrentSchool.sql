-- ============================================================
-- Teacher Master: NationalCode, AGID (AppointmentGroupMaster),
-- DoWSCurrentSchool + lookups / get / save wiring
-- ============================================================
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.AppointmentGroupMaster', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AppointmentGroupMaster (
        AGID     BIGINT NOT NULL,
        SrNo     BIGINT NULL,
        AGName   NVARCHAR(100) NULL,
        IsActive BIT NULL CONSTRAINT DF_AppointmentGroupMaster_IsActive DEFAULT (1),
        CONSTRAINT PK_AppointmentGroupMaster PRIMARY KEY (AGID)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AppointmentGroupMaster)
BEGIN
    INSERT INTO dbo.AppointmentGroupMaster (AGID, SrNo, AGName, IsActive) VALUES
        (1, 1, N'1-5', 1),
        (2, 2, N'6-8', 1),
        (3, 3, N'9-10', 1),
        (4, 4, N'11-12', 1);
END
GO

IF COL_LENGTH(N'dbo.UserMaster', N'NationalCode') IS NULL
    ALTER TABLE dbo.UserMaster ADD NationalCode NVARCHAR(100) NULL;
GO

IF COL_LENGTH(N'dbo.UserMaster', N'AGID') IS NULL
    ALTER TABLE dbo.UserMaster ADD AGID BIGINT NULL;
GO

IF COL_LENGTH(N'dbo.UserMaster', N'DoWSCurrentSchool') IS NULL
    ALTER TABLE dbo.UserMaster ADD DoWSCurrentSchool DATETIME NULL;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.LanguageKeyValueMaster WHERE KeyName = N'AGID')
BEGIN
    INSERT INTO dbo.LanguageKeyValueMaster (KeyName, KeyValueMR, KeyValueEN)
    VALUES (N'AGID', N'एजीआयडी', N'AGID');
END
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

    SELECT
        dm.DesignationID AS DesignationCode,
        dm.DesignationName,
        dm.LeaveYear
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

    SELECT doc.DocumentID AS DocumentCode, doc.DocumentName
    FROM dbo.DocumentMaster doc
    WHERE doc.DocumentID IS NOT NULL AND ISNULL(doc.IsActive, 1) = 1
    ORDER BY doc.DocumentName;

    SELECT ag.AGID, ag.AGName
    FROM dbo.AppointmentGroupMaster ag
    WHERE ISNULL(ag.IsActive, 1) = 1
    ORDER BY ISNULL(ag.SrNo, ag.AGID), ag.AGID;
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
    @NationalCode NVARCHAR(100) = NULL,
    @AGID BIGINT = NULL,
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
    @DoWSCurrentSchool DATE = NULL,
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
    @SchoolsJson NVARCHAR(MAX) = NULL,
    @ActorUserID BIGINT = NULL
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
    SET @NationalCode = NULLIF(LTRIM(RTRIM(@NationalCode)), N'');

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
            Address, CityName, PhotoPath, GenderID, Dob, AdharCardNo, NationalCode, AGID, ShalarthID,
            ScaleOfPay, CasteName, ReligionID, CategoryID, BloodGroupID,
            MobileNo1, MobileNo2, EmailID, PanNo, Remark,
            SubjectName1, SubjectName2, SubjectName3,
            SQualification, BQualification, AfterDegreePassedSubjects,
            SansthaOrderNoAndDate, ZPOrderNoAndDate,
            SansthaServiceOrderNoAndDate, ZPServiceOrderNoAndDate,
            DateOfWorkingStart, DoWSCurrentSchool, JTCategoryID, PaymentGradeDate, NivadGradeDate,
            RetirementYear, ServiceOutDate, ShiftID,
            AppUserName, AppPassword, CloseFlag, IsActive, CreatedDate, CreatedUserID, ModifiedDate, ModifiedUserID
        )
        VALUES (
            @OrgID, @StaffTypeID, ISNULL(@ResolvedSrNo, 1), @UserRoleID, @DesignationCode,
            @Firstname, @MiddleName, @LastName, @EmployeeName, @EmployeeShortName,
            @PermanentAddress, @CityName, @PhotoPath, @GenderCode, @Dob, @AdharCardNo, @NationalCode, @AGID, @ShalarthID,
            @ScaleOfPay, @CasteName, @ReligionID, @CategoryID, @BloodGroupID,
            @MobileNo1, @MobileNo2, @EmailID, @PanNo, @Remark,
            @SubjectName1, @SubjectName2, @SubjectName3,
            @SQualification, @BQualification, @AfterDegreePassedSubjects,
            @SansthaOrderNoAndDate, @ZPOrderNoAndDate,
            @SansthaServiceOrderNoAndDate, @ZPServiceOrderNoAndDate,
            @DateOfWorkingStart, @DoWSCurrentSchool, @JTCategoryID, @PaymentGradeDate, @NivadGradeDate,
            @RetirementYear, @ServiceOutDate, @ShiftID,
            @AppUserName, @AppPassword, @CloseFlag, @IsActive, GETDATE(), @ActorUserID, GETDATE(), @ActorUserID
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
            NationalCode = @NationalCode,
            AGID = @AGID,
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
            DoWSCurrentSchool = @DoWSCurrentSchool,
            JTCategoryID = @JTCategoryID,
            PaymentGradeDate = @PaymentGradeDate,
            NivadGradeDate = @NivadGradeDate,
            RetirementYear = @RetirementYear,
            ServiceOutDate = @ServiceOutDate,
            ShiftID = @ShiftID,
            AppUserName = @AppUserName,
            AppPassword = CASE WHEN @UpdatePassword = 1 AND @AppPassword IS NOT NULL AND @AppPassword <> '' THEN @AppPassword ELSE AppPassword END,
            CloseFlag = @CloseFlag,
            IsActive = @IsActive,
            ModifiedDate = GETDATE(),
            ModifiedUserID = @ActorUserID
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
    DELETE FROM dbo.UserSchool WHERE UserID = @UserID;

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
            UserID, SrNo, OrgID, DesignationID, TeachClass, TeachSubject,
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
