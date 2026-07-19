-- Employee module: UserMaster + UserEducation + UserDocument + UserSchool
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Employee_GetLookups
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ut.UserRoleID,
        ut.UserRoleName
    FROM dbo.UserRoleMaster ut
    WHERE ut.UserRoleID IS NOT NULL
    ORDER BY ut.UserRoleName;

    SELECT
        dm.DesignationID AS DesignationCode,
        dm.DesignationName
    FROM dbo.DesignationMaster dm
    WHERE dm.DesignationID IS NOT NULL
      AND ISNULL(dm.IsActive, 1) = 1
    ORDER BY dm.DesignationName;

    SELECT
        gm.GenderID AS GenderCode,
        gm.GenderName
    FROM dbo.GenderMaster gm
    WHERE gm.GenderID IS NOT NULL
      AND ISNULL(gm.IsActive, 1) = 1
    ORDER BY gm.GenderName;

    SELECT
        em.EducationID AS EducationCode,
        em.EducationName
    FROM dbo.EducationMaster em
    WHERE ISNULL(em.IsActive, 1) = 1
    ORDER BY em.EducationName;

    SELECT
        doc.DocumentID AS DocumentCode,
        doc.DocumentName
    FROM dbo.DocumentMaster doc
    WHERE ISNULL(doc.IsActive, 1) = 1
    ORDER BY doc.DocumentName;

    SELECT
        qt.QualificationTypeCode,
        qt.QualificationTypeName
    FROM dbo.QualificationTypeMaster qt
    WHERE qt.QualificationTypeCode IS NOT NULL
    ORDER BY qt.QualificationTypeName;

    SELECT
        es.EducationStatusID AS EducationStatusCode,
        es.EducationStatusName
    FROM dbo.EducationStatusMaster es
    WHERE es.EducationStatusID IS NOT NULL
      AND ISNULL(es.IsActive, 1) = 1
    ORDER BY es.EducationStatusName;
END
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
        um.MobileNo1,
        um.OrgID,
        om.OrganizationName,
        um.DesignationCode,
        dm.DesignationName,
        um.UserRoleID,
        ut.UserRoleName,
        um.IsActive
    FROM dbo.UserMaster um
    LEFT JOIN dbo.OrgMaster om
        ON om.OrgID = um.OrgID
       AND om.Status = 1
    LEFT JOIN dbo.DesignationMaster dm
        ON dm.DesignationID = um.DesignationCode
    LEFT JOIN dbo.UserRoleMaster ut
        ON ut.UserRoleID = um.UserRoleID
    WHERE um.IsActive = 1
      AND (@OrgID IS NULL OR um.OrgID = @OrgID)
      AND (
          @Search IS NULL
          OR @Search = ''
          OR um.Firstname LIKE '%' + @Search + '%'
          OR um.LastName LIKE '%' + @Search + '%'
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
        um.SchoolCode,
        um.OrgID,
        um.UserRoleID,
        um.DesignationCode,
        um.Firstname,
        um.MiddleName,
        um.LastName,
        um.PermanentAddress,
        um.LocalAddress,
        um.GenderCode,
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

CREATE OR ALTER PROCEDURE dbo.sp_Employee_Education_GetByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ue.UserID,
        ue.SrNo,
        ue.EducationCodePassExam,
        ue.Univercity,
        ue.PassingYear,
        ue.Percentage,
        ue.QualificationTypeCode,
        ue.EducationStatusCode
    FROM dbo.UserEducation ue
    WHERE ue.UserID = @UserID
    ORDER BY ue.SrNo;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Employee_Document_GetByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ud.UserID,
        ud.EmpDocumentCode,
        ud.EmpDocumentPath
    FROM dbo.UserDocument ud
    WHERE ud.UserID = @UserID
    ORDER BY ud.EmpDocumentCode;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Employee_School_GetByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        us.UserSchoolID,
        us.UserID,
        us.SrNo,
        us.OrgID,
        CAST(NULL AS BIGINT) AS SchoolCode,
        us.DesignationID AS DesignationCode,
        us.TeachClass,
        us.TeachSubject,
        us.SchoolJoiningDate,
        us.SchoolLeaveDate,
        CAST(NULL AS NVARCHAR(255)) AS SansthaTransferOrderNoAndDate,
        CAST(NULL AS NVARCHAR(255)) AS ZPTransferOrderNoAndDate
    FROM dbo.UserSchool us
    WHERE us.UserID = @UserID
    ORDER BY us.SrNo, us.UserSchoolID;
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

    BEGIN TRANSACTION;

    IF @UserID IS NULL OR @UserID = 0
    BEGIN
        INSERT INTO dbo.UserMaster (
            SchoolCode,
            OrgID,
            UserRoleID,
            DesignationCode,
            Firstname,
            MiddleName,
            LastName,
            PermanentAddress,
            LocalAddress,
            GenderCode,
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
            @SchoolCode,
            @OrgID,
            @UserRoleID,
            @DesignationCode,
            @Firstname,
            @MiddleName,
            @LastName,
            @PermanentAddress,
            @LocalAddress,
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
            SchoolCode = @SchoolCode,
            OrgID = @OrgID,
            UserRoleID = @UserRoleID,
            DesignationCode = @DesignationCode,
            Firstname = @Firstname,
            MiddleName = @MiddleName,
            LastName = @LastName,
            PermanentAddress = @PermanentAddress,
            LocalAddress = @LocalAddress,
            GenderCode = @GenderCode,
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

    DELETE FROM dbo.UserEducation WHERE UserID = @UserID;
    DELETE FROM dbo.UserDocument WHERE UserID = @UserID;
    DELETE FROM dbo.UserSchool WHERE UserID = @UserID;

    IF @EducationJson IS NOT NULL AND ISJSON(@EducationJson) = 1
    BEGIN
        INSERT INTO dbo.UserEducation (
            UserID,
            SrNo,
            EducationCodePassExam,
            Univercity,
            PassingYear,
            Percentage,
            QualificationTypeCode,
            EducationStatusCode
        )
        SELECT
            @UserID,
            j.SrNo,
            j.EducationCodePassExam,
            j.Univercity,
            j.PassingYear,
            j.Percentage,
            j.QualificationTypeCode,
            j.EducationStatusCode
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
        INSERT INTO dbo.UserDocument (
            UserID,
            EmpDocumentCode,
            EmpDocumentPath
        )
        SELECT
            @UserID,
            j.EmpDocumentCode,
            j.EmpDocumentPath
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
            UserID,
            SrNo,
            OrgID,
            DesignationID,
            TeachClass,
            TeachSubject,
            SchoolJoiningDate,
            SchoolLeaveDate
        )
        SELECT
            @UserID,
            j.SrNo,
            j.OrgID,
            j.DesignationCode,
            j.TeachClass,
            j.TeachSubject,
            j.SchoolJoiningDate,
            j.SchoolLeaveDate
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
