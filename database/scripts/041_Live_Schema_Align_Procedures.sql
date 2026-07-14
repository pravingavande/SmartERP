-- 14 July 2026 — Live DB hotfix: align stored procedures with actual SmartERP schema.
-- No ALTER TABLE / no new columns. Maps API aliases to live columns:
--   DesignationID/GenderID/Address/OrgID/IsActive, UserRoleMaster, DocumentID/DocumentPath.
USE SmartERP;
GO

/* ---- Dashboard ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_GetSummary
    @OrgID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(om.OrganizationName, N'Sanstha') AS SansthaName,
        25 AS TotalSchool,
        500 AS TotalStudent,
        200 AS TotalTeacher,
        150 AS TeachingStaff,
        50 AS NonTeachingStaff,
        170 AS PermanentStaff,
        30 AS TemporaryStaff,
        200 AS MaleStudents,
        300 AS FemaleStudents,
        120 AS MaleTeachers,
        80 AS FemaleTeachers
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @OrgID
      AND ISNULL(om.IsActive, 1) = 1;
END
GO

/* ---- Employee ---- */
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

CREATE OR ALTER PROCEDURE dbo.sp_Employee_Education_GetByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF OBJECT_ID('dbo.UserEducation', 'U') IS NULL
    BEGIN
        SELECT TOP 0
            CAST(0 AS BIGINT) AS UserID,
            CAST(0 AS BIGINT) AS SrNo,
            CAST(0 AS BIGINT) AS EducationCodePassExam,
            CAST(NULL AS NVARCHAR(255)) AS Univercity,
            CAST(NULL AS NVARCHAR(50)) AS PassingYear,
            CAST(NULL AS NVARCHAR(50)) AS Percentage,
            CAST(0 AS BIGINT) AS QualificationTypeCode,
            CAST(0 AS BIGINT) AS EducationStatusCode;
        RETURN;
    END

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
        ud.DocumentID AS EmpDocumentCode,
        ud.DocumentPath AS EmpDocumentPath
    FROM dbo.UserDocument ud
    WHERE ud.UserID = @UserID
    ORDER BY ud.DocumentID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Employee_School_GetByUserId
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        us.TID,
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
    WHERE us.TID = @UserID
    ORDER BY us.SrNo;
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

    DECLARE @Address NVARCHAR(255) = COALESCE(
        NULLIF(LTRIM(RTRIM(@PermanentAddress)), N''),
        NULLIF(LTRIM(RTRIM(@LocalAddress)), N'')
    );

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
            DocumentID,
            DocumentPath
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
            TID,
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

/* ---- Ticket list (OrgID-based scope) ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetList
    @OrgID BIGINT = NULL,
    @UserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @SansthaOrgID BIGINT;

    IF @UserID IS NOT NULL
    BEGIN
        SELECT
            @UserOrgID = um.OrgID,
            @UserRoleID = um.UserRoleID
        FROM dbo.UserMaster um
        WHERE um.UserID = @UserID
          AND um.IsActive = 1;

        SELECT @SansthaOrgID = om.UnderOrgID
        FROM dbo.OrgMaster om
        WHERE om.OrgID = @UserOrgID
          AND ISNULL(om.IsActive, 1) = 1;

        IF @SansthaOrgID IS NULL
            SET @SansthaOrgID = @UserOrgID;

        IF EXISTS (
            SELECT 1
            FROM dbo.OrgMaster s
            WHERE s.OrgID = @SansthaOrgID
              AND s.OrgID = s.UnderOrgID
              AND ISNULL(s.IsActive, 1) = 1
        )
        AND (
            @UserOrgID = @SansthaOrgID
            OR @UserRoleID IN (1, 2)
            OR EXISTS (
                SELECT 1
                FROM dbo.OrgMaster sch
                WHERE sch.OrgID = @UserOrgID
                  AND sch.UnderOrgID = @SansthaOrgID
                  AND ISNULL(sch.IsActive, 1) = 1
            )
        )
            SET @IsSansthaUser = 1;
    END

    SELECT
        te.TicketID,
        te.TicketNo,
        te.OrgID,
        te.TicketDate,
        te.Subject,
        te.Description,
        te.Module,
        te.Priority,
        te.ReplyRequired,
        te.TicketStatusID,
        te.Attachment,
        te.UserID,
        te.CreatedDate,
        te.ModifyDate,
        te.SubmittedDate,
        te.SentDate,
        te.ReadDate,
        te.LastReplyDate,
        te.ClosedDate,
        te.ClosedByUserID,
        te.IP,
        om.OrganizationName,
        ts.StatusName,
        ts.StatusNameMr,
        um.AppUserName AS UserCode,
        schools.SchoolNames
    FROM dbo.TicketEntry te
    INNER JOIN dbo.OrgMaster om ON om.OrgID = te.OrgID
    INNER JOIN dbo.TicketStatusMaster ts ON ts.TicketStatusID = te.TicketStatusID
    LEFT JOIN dbo.UserMaster um ON um.UserID = te.UserID
    OUTER APPLY (
        SELECT STRING_AGG(sch.OrganizationName, N', ') WITHIN GROUP (ORDER BY sch.OrganizationName) AS SchoolNames
        FROM dbo.TicketEntryOrg teo
        INNER JOIN dbo.OrgMaster sch ON sch.OrgID = teo.OrgID
        WHERE teo.TicketID = te.TicketID
    ) schools
    WHERE te.IsActive = 1
      AND (
          @OrgID IS NULL
          OR EXISTS (
              SELECT 1
              FROM dbo.TicketEntryOrg teo
              WHERE teo.TicketID = te.TicketID
                AND teo.OrgID = @OrgID
          )
      )
      AND (
          @UserID IS NULL
          OR @IsSansthaUser = 1
          OR te.UserID = @UserID
          OR EXISTS (
              SELECT 1
              FROM dbo.TicketEntryOrg teo
              WHERE teo.TicketID = te.TicketID
                AND teo.OrgID = @UserOrgID
          )
      )
    ORDER BY te.TicketDate DESC, te.TicketID DESC;
END
GO

/* ---- Event calendar (OrgID-based scope) ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Event_GetPendingReportingCount
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT @SansthaOrgID = om.UnderOrgID
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @UserOrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @SansthaOrgID IS NULL
        SET @SansthaOrgID = @UserOrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND ISNULL(s.IsActive, 1) = 1
    )
    AND (
        @UserOrgID = @SansthaOrgID
        OR @UserRoleID IN (1, 2)
    )
        SET @IsSansthaUser = 1;

    SELECT COUNT(1) AS PendingCount
    FROM dbo.Events e
    WHERE e.Status = N'पूर्ण झाले'
      AND (e.EventReporting IS NULL OR LTRIM(RTRIM(e.EventReporting)) = N'')
      AND e.EventDate <= CAST(GETDATE() AS DATE)
      AND (
          @IsSansthaUser = 1
          OR EXISTS (
              SELECT 1
              FROM dbo.EventOrg eo
              WHERE eo.EventID = e.EventId
                AND eo.OrgID = @UserOrgID
          )
          OR e.OrgID = @UserOrgID
      );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetPendingReportingList
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT @SansthaOrgID = om.UnderOrgID
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @UserOrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @SansthaOrgID IS NULL
        SET @SansthaOrgID = @UserOrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND ISNULL(s.IsActive, 1) = 1
    )
    AND (
        @UserOrgID = @SansthaOrgID
        OR @UserRoleID IN (1, 2)
    )
        SET @IsSansthaUser = 1;

    SELECT
        e.EventId AS EventID,
        e.Title,
        e.EventDate,
        e.Status,
        schools.SchoolNames,
        e.EventReporting
    FROM dbo.Events e
    OUTER APPLY (
        SELECT STRING_AGG(sch.OrganizationName, N', ') WITHIN GROUP (ORDER BY sch.OrganizationName) AS SchoolNames
        FROM dbo.EventOrg eo
        INNER JOIN dbo.OrgMaster sch ON sch.OrgID = eo.OrgID
        WHERE eo.EventID = e.EventId
    ) schools
    WHERE e.Status = N'पूर्ण झाले'
      AND (e.EventReporting IS NULL OR LTRIM(RTRIM(e.EventReporting)) = N'')
      AND e.EventDate <= CAST(GETDATE() AS DATE)
      AND (
          @IsSansthaUser = 1
          OR EXISTS (
              SELECT 1
              FROM dbo.EventOrg eo
              WHERE eo.EventID = e.EventId
                AND eo.OrgID = @UserOrgID
          )
          OR e.OrgID = @UserOrgID
      )
    ORDER BY e.EventDate DESC, e.EventId DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetByDateRange
    @FromDate DATE,
    @ToDate DATE,
    @UserID BIGINT = NULL,
    @OrgID INT = NULL,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;

    IF @UserID IS NOT NULL
    BEGIN
        SELECT
            @UserOrgID = um.OrgID,
            @UserRoleID = um.UserRoleID
        FROM dbo.UserMaster um
        WHERE um.UserID = @UserID
          AND um.IsActive = 1;

        SELECT @SansthaOrgID = om.UnderOrgID
        FROM dbo.OrgMaster om
        WHERE om.OrgID = @UserOrgID
          AND ISNULL(om.IsActive, 1) = 1;

        IF @SansthaOrgID IS NULL
            SET @SansthaOrgID = @UserOrgID;

        IF EXISTS (
            SELECT 1
            FROM dbo.OrgMaster s
            WHERE s.OrgID = @SansthaOrgID
              AND s.OrgID = s.UnderOrgID
              AND ISNULL(s.IsActive, 1) = 1
        )
        AND (
            @UserOrgID = @SansthaOrgID
            OR @UserRoleID IN (1, 2)
        )
            SET @IsSansthaUser = 1;
    END

    SELECT
        e.EventId AS EventID,
        e.Title,
        e.Description,
        e.EventDate,
        e.StartTime,
        e.EndTime,
        e.IsAllDay,
        e.EventTypeId AS EventTypeID,
        et.EventType AS EventTypeName,
        e.LocationID,
        COALESCE(lm.LocationName, e.Location) AS Location,
        e.Color,
        e.Status,
        e.Notes,
        e.UnderOrgID,
        e.OrgID,
        e.SchoolCode,
        e.EventReporting,
        e.EventPhotoAttachment,
        e.EventNewsAttachment,
        e.CreatedByUserId,
        e.CreatedAt,
        e.UpdatedAt,
        schools.SchoolNames,
        schools.OrgIDs,
        CASE WHEN e.EventDate < CAST(GETDATE() AS DATE) THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsLocked
    FROM dbo.Events e
    LEFT JOIN dbo.EventTypes et ON et.EventTypeId = e.EventTypeId
    LEFT JOIN dbo.LocationMaster lm ON lm.LocationID = e.LocationID
    OUTER APPLY (
        SELECT
            STRING_AGG(sch.OrganizationName, N', ') WITHIN GROUP (ORDER BY eo.OrgID) AS SchoolNames,
            STRING_AGG(CAST(eo.OrgID AS NVARCHAR(20)), N',') WITHIN GROUP (ORDER BY eo.OrgID) AS OrgIDs
        FROM dbo.EventOrg eo
        INNER JOIN dbo.OrgMaster sch ON sch.OrgID = eo.OrgID
        WHERE eo.EventID = e.EventId
    ) schools
    WHERE e.EventDate >= @FromDate
      AND e.EventDate <= @ToDate
      AND (
          @OrgID IS NULL
          OR EXISTS (
              SELECT 1
              FROM dbo.EventOrg eo
              WHERE eo.EventID = e.EventId
                AND eo.OrgID = @OrgID
          )
          OR e.OrgID = @OrgID
      )
      AND (
          @UserID IS NULL
          OR @IsSansthaUser = 1
          OR EXISTS (
              SELECT 1
              FROM dbo.EventOrg eo
              WHERE eo.EventID = e.EventId
                AND eo.OrgID = @UserOrgID
          )
          OR e.OrgID = @UserOrgID
      )
      AND (
          @Search IS NULL
          OR LEN(LTRIM(RTRIM(@Search))) = 0
          OR e.Title LIKE N'%' + @Search + N'%'
          OR e.Location LIKE N'%' + @Search + N'%'
          OR lm.LocationName LIKE N'%' + @Search + N'%'
      )
    ORDER BY e.EventDate, e.StartTime, e.EventId;
END
GO

/* ---- Audit (OrgID-based scope) ---- */
CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetSansthaOrgs
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AppUserName VARCHAR(50);

    SELECT @AppUserName = um.AppUserName
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    IF @AppUserName IS NULL
        RETURN;

    SELECT DISTINCT
        san.OrgID,
        san.OrganizationName,
        CAST(NULL AS NVARCHAR(100)) AS ShortName,
        CAST(NULL AS BIGINT) AS SchoolCode,
        san.UnderOrgID
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    INNER JOIN dbo.OrgMaster san
        ON san.OrgID = v.OrgGroupID
       AND ISNULL(san.IsActive, 1) = 1
       AND san.OrgID = san.UnderOrgID
    WHERE v.AppUserName = @AppUserName
    ORDER BY san.OrganizationName;

    IF @@ROWCOUNT > 0
        RETURN;

    SELECT
        san.OrgID,
        san.OrganizationName,
        CAST(NULL AS NVARCHAR(100)) AS ShortName,
        CAST(NULL AS BIGINT) AS SchoolCode,
        san.UnderOrgID
    FROM dbo.OrgMaster san
    INNER JOIN dbo.UserMaster um ON um.UserID = @UserID
    WHERE san.OrgID = um.OrgID
      AND san.OrgID = san.UnderOrgID
      AND ISNULL(san.IsActive, 1) = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetDashboardSummary
    @UserID BIGINT,
    @FyID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @FyName NVARCHAR(100) = N'';

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT @SansthaOrgID = om.UnderOrgID
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @UserOrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @SansthaOrgID IS NULL
        SET @SansthaOrgID = @UserOrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND ISNULL(s.IsActive, 1) = 1
    )
    AND (
        @UserOrgID = @SansthaOrgID
        OR @UserRoleID IN (1, 2)
    )
        SET @IsSansthaUser = 1;

    CREATE TABLE #UserOrgs (OrgID BIGINT NOT NULL PRIMARY KEY);

    INSERT INTO #UserOrgs (OrgID)
    SELECT DISTINCT om.OrgID
    FROM dbo.OrgMaster om
    WHERE ISNULL(om.IsActive, 1) = 1
      AND (
          (@IsSansthaUser = 1 AND (om.OrgID = @SansthaOrgID OR om.UnderOrgID = @SansthaOrgID))
          OR (@IsSansthaUser = 0 AND om.OrgID = @UserOrgID)
      );

    IF @FyID IS NULL
    BEGIN
        SELECT TOP 1 @FyID = fy.FyID
        FROM dbo.FyMaster fy
        WHERE fy.IsActive = 1
        ORDER BY fy.FromDate DESC;
    END

    SELECT @FyName = fy.FyName
    FROM dbo.FyMaster fy
    WHERE fy.FyID = @FyID;

    SELECT
        @FyID AS FyID,
        ISNULL(@FyName, N'') AS FyName,
        ISNULL(rv.Cnt, 0) AS ReceiptVoucherCount,
        ISNULL(rv.Amt, 0) AS ReceiptVoucherAmount,
        ISNULL(pv.Cnt, 0) AS PaymentVoucherCount,
        ISNULL(pv.Amt, 0) AS PaymentVoucherAmount,
        ISNULL(dr.Cnt, 0) AS DonationCount,
        ISNULL(dr.Amt, 0) AS DonationAmount
    FROM (SELECT 1 AS x) base
    OUTER APPLY (
        SELECT
            COUNT(*) AS Cnt,
            ISNULL(SUM(v.TotalAmount), 0) AS Amt
        FROM dbo.ACVoucher v
        INNER JOIN #UserOrgs uo ON uo.OrgID = v.OrgID
        WHERE v.FyID = @FyID
          AND (v.VType = N'R' OR v.VType = N'RV')
    ) rv
    OUTER APPLY (
        SELECT
            COUNT(*) AS Cnt,
            ISNULL(SUM(v.TotalAmount), 0) AS Amt
        FROM dbo.ACVoucher v
        INNER JOIN #UserOrgs uo ON uo.OrgID = v.OrgID
        WHERE v.FyID = @FyID
          AND (v.VType = N'P' OR v.VType = N'PV')
    ) pv
    OUTER APPLY (
        SELECT
            COUNT(*) AS Cnt,
            ISNULL(SUM(dre.Amount), 0) AS Amt
        FROM dbo.DREntry dre
        INNER JOIN #UserOrgs uo ON uo.OrgID = dre.OrgID
        WHERE dre.FyID = @FyID
    ) dr;

    DROP TABLE #UserOrgs;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetDashboard
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;

    SELECT
        @UserOrgID = um.OrgID,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT @SansthaOrgID = om.UnderOrgID
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @UserOrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @SansthaOrgID IS NULL
        SET @SansthaOrgID = @UserOrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND ISNULL(s.IsActive, 1) = 1
    )
    AND (
        @UserOrgID = @SansthaOrgID
        OR @UserRoleID IN (1, 2)
    )
        SET @IsSansthaUser = 1;

    SELECT
        om.OrgID,
        om.OrganizationName,
        arm.AccountRegisterID,
        arm.AccountRegister,
        lastV.LastTransactionDate,
        ISNULL(bal.BankBalance, 0) AS BankBalance,
        CASE
            WHEN arm.AccountRegister LIKE N'%Cash%' OR arm.AccountRegister LIKE N'%रोख%' THEN
                CASE WHEN vtype.SampleVType = N'R' THEN N'Receipt Voucher - Cash' ELSE N'Payment Voucher - Cash' END
            ELSE
                CASE WHEN vtype.SampleVType = N'R' THEN N'Receipt Voucher - Bank' ELSE N'Payment Voucher - Bank' END
        END AS VoucherCategory
    FROM dbo.OrgMaster om
    CROSS APPLY (
        SELECT TOP 1 ard.AccountRegisterID, ard.UnderOrgID AS RegisterOrgID
        FROM dbo.ACAccountRegisterOrgWiseDefine ard
        WHERE ard.UnderOrgID = om.OrgID
           OR (
               NOT EXISTS (
                   SELECT 1
                   FROM dbo.ACAccountRegisterOrgWiseDefine own
                   WHERE own.UnderOrgID = om.OrgID
               )
               AND ard.UnderOrgID = om.UnderOrgID
           )
        ORDER BY CASE WHEN ard.UnderOrgID = om.OrgID THEN 0 ELSE 1 END
    ) ard
    INNER JOIN dbo.ACAccountRegisterMaster arm ON arm.AccountRegisterID = ard.AccountRegisterID
    OUTER APPLY (
        SELECT MAX(v.VDate) AS LastTransactionDate
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
    ) lastV
    OUTER APPLY (
        SELECT
            SUM(
                CASE
                    WHEN v.VType IN (N'R', N'RV') THEN ISNULL(v.TotalAmount, 0)
                    WHEN v.VType IN (N'P', N'PV') THEN -ISNULL(v.TotalAmount, 0)
                    ELSE 0
                END
            ) AS BankBalance
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
    ) bal
    OUTER APPLY (
        SELECT TOP 1 v.VType AS SampleVType
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
        ORDER BY v.VDate DESC, v.VoucherID DESC
    ) vtype
    WHERE ISNULL(om.IsActive, 1) = 1
      AND arm.IsActive = 1
      AND (
          (@IsSansthaUser = 1 AND (om.OrgID = @SansthaOrgID OR om.UnderOrgID = @SansthaOrgID))
          OR (@IsSansthaUser = 0 AND om.OrgID = @UserOrgID)
      )
    ORDER BY om.OrganizationName, arm.AccountRegister;
END
GO

/* ---- Master: academic schedule lookups ---- */
CREATE OR ALTER PROCEDURE dbo.sp_AcademicSchedule_GetLookups
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        san.OrgID,
        san.OrganizationName,
        CAST(NULL AS NVARCHAR(100)) AS ShortName,
        CAST(NULL AS BIGINT) AS SchoolCode,
        san.UnderOrgID
    FROM dbo.vw_UserloginWithOrgIDAndORGGROUP v
    INNER JOIN dbo.OrgMaster san
        ON san.OrgID = v.OrgGroupID
       AND ISNULL(san.IsActive, 1) = 1
       AND san.OrgID = san.UnderOrgID
    WHERE v.AppUserName = (
        SELECT um.AppUserName
        FROM dbo.UserMaster um
        WHERE um.UserID = @UserID
          AND um.IsActive = 1
    )
    ORDER BY san.OrganizationName, san.OrgID;

    SELECT
        c.ClassID,
        c.ClassName
    FROM dbo.ClassMaster c
    WHERE ISNULL(c.IsActive, 1) = 1
    ORDER BY c.ClassName, c.ClassID;

    SELECT
        s.SubjectID,
        s.SubjectName
    FROM dbo.SubjectMaster s
    WHERE ISNULL(s.IsActive, 1) = 1
    ORDER BY s.SubjectName, s.SubjectID;

    SELECT
        w.WeekID,
        w.WeekName
    FROM dbo.WeekMaster w
    WHERE ISNULL(w.IsActive, 1) = 1
    ORDER BY w.WeekID;

    SELECT
        ay.AyID,
        ay.AyName,
        ay.FromDate,
        ay.ToDate
    FROM dbo.AyMaster ay
    WHERE ISNULL(ay.IsActive, 1) = 1
    ORDER BY ay.FromDate DESC, ay.AyID;
END
GO

PRINT N'041_Live_Schema_Align_Procedures applied.';
GO
