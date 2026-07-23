-- Teacher Master: block duplicate EmployeeName + MobileNo1 on save.
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Teacher_CheckEmployeeMobile
    @Firstname NVARCHAR(120),
    @MiddleName NVARCHAR(120) = NULL,
    @LastName NVARCHAR(120) = NULL,
    @MobileNo1 NVARCHAR(50),
    @ExcludeUserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EmployeeName NVARCHAR(400) = LTRIM(RTRIM(
        CONCAT(
            ISNULL(NULLIF(LTRIM(RTRIM(@Firstname)), N''), N''),
            CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(@MiddleName, N''))), N'') IS NOT NULL
                 THEN N' ' + LTRIM(RTRIM(@MiddleName)) ELSE N'' END,
            CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(@LastName, N''))), N'') IS NOT NULL
                 THEN N' ' + LTRIM(RTRIM(@LastName)) ELSE N'' END
        )
    ));

    DECLARE @Mobile NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@MobileNo1, N'')));

    SELECT CASE
        WHEN @EmployeeName = N'' OR @Mobile IN (N'', N'0') THEN 0
        WHEN EXISTS (
            SELECT 1
            FROM dbo.UserMaster um
            WHERE LTRIM(RTRIM(ISNULL(um.EmployeeName, N''))) = @EmployeeName
              AND LTRIM(RTRIM(ISNULL(um.MobileNo1, N''))) = @Mobile
              AND (@ExcludeUserID IS NULL OR @ExcludeUserID = 0 OR um.UserID <> @ExcludeUserID)
        ) THEN 1
        ELSE 0
    END AS IsDuplicate;
END
GO

-- Patch sp_Teacher_Save (extends 112): duplicate guard before transaction.
CREATE OR ALTER PROCEDURE dbo.sp_Teacher_Save
    @UserID BIGINT = NULL OUTPUT,
    @OrgID BIGINT = NULL,
    @SansthaID BIGINT = NULL,
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

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @SansthaID IS NULL OR @SansthaID <= 0
    BEGIN
        SELECT @SansthaID = CASE
            WHEN om.OrgID = ISNULL(om.UnderOrgID, om.OrgID) THEN om.OrgID
            ELSE om.UnderOrgID
        END
        FROM dbo.OrgMaster om
        WHERE om.OrgID = @OrgID;
    END

    IF @SansthaID IS NOT NULL AND @SansthaID > 0
       AND NOT EXISTS (
            SELECT 1
            FROM dbo.OrgMaster om
            WHERE om.OrgID = @OrgID
              AND ISNULL(om.IsActive, 1) = 1
              AND (
                    om.OrgID = @SansthaID
                    OR om.UnderOrgID = @SansthaID
                  )
       )
    BEGIN
        RAISERROR('Selected organization does not belong to the specified sanstha.', 16, 1);
        RETURN;
    END

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

    IF LTRIM(RTRIM(ISNULL(@MobileNo1, N''))) NOT IN (N'', N'0')
       AND EXISTS (
            SELECT 1
            FROM dbo.UserMaster um
            WHERE LTRIM(RTRIM(ISNULL(um.EmployeeName, N''))) = @EmployeeName
              AND LTRIM(RTRIM(ISNULL(um.MobileNo1, N''))) = LTRIM(RTRIM(@MobileNo1))
              AND (
                    @UserID IS NULL
                    OR @UserID = 0
                    OR um.UserID <> @UserID
                  )
       )
    BEGIN
        RAISERROR(N'A teacher/employee with the same name and mobile no. 1 already exists.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    IF @UserID IS NULL OR @UserID = 0
    BEGIN
        DECLARE @ResolvedSrNo INT = @SrNo;
        IF @ResolvedSrNo IS NULL
        BEGIN
            SELECT @ResolvedSrNo = ISNULL(MAX(um.SrNo), 0) + 1
            FROM dbo.UserMaster um
            WHERE um.OrgID = @OrgID
              AND ISNULL(um.UserRoleID, 0) <> 5
              AND (
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
                    OR ISNULL(um.StaffTypeID, 0) > 2
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
          AND ISNULL(UserRoleID, 0) <> 5
          AND (
                StaffTypeID IN (1, 2)
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
                OR ISNULL(StaffTypeID, 0) > 2
            );

        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR(N'Teacher record was not updated. User may not exist or is not eligible for Teacher Master.', 16, 1);
            RETURN;
        END
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

PRINT '114_Teacher_Duplicate_Name_Mobile applied.';
GO
