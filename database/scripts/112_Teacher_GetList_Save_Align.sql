-- ============================================================
-- Teacher Master: saved records not appearing on list (UserID 12, 341, etc.)
--
-- RCA:
--   1) Script 109 changed sp_Teacher_GetList to exclude StaffTypeID = 1
--      (ISNULL(StaffTypeID,0) <> 1), undoing script 094 which explicitly
--      included Employee (StaffTypeID=1) for Sanstha/School admins.
--   2) sp_Teacher_Save UPDATE still required StaffTypeID IN (1,2) or legacy
--      NULL+subjects, so live rows with StaffTypeID > 2 (e.g. 7) appeared
--      to save (API success) but UserMaster was never updated.
--   3) sp_Teacher_GetById (109) has no StaffType filter — edit works, list hides.
--
-- Fix (SP only — no data changes):
--   Align GetList / GetNextSrNo / Save with one Teacher Master eligibility rule.
--   Keep GetById from 109 unchanged.
-- ============================================================
SET NOCOUNT ON;
GO

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
        )
      AND ISNULL(ur.UserRoleName, N'') <> N'SuperAdmin'
      AND ISNULL(um.UserRoleID, 0) <> 5
      AND (
            (@OrgID IS NOT NULL AND um.OrgID = @OrgID)
            OR (
                @OrgID IS NULL
                AND (
                    @SansthaID IS NULL
                    OR EXISTS (
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

    SELECT ISNULL(@NextSrNo, 1) AS NextSrNo;
END
GO

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

PRINT '112_Teacher_GetList_Save_Align applied.';
GO
