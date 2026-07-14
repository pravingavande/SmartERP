-- Ticket Management V2: multi-school, replies, statuses, remove Amount
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

IF OBJECT_ID('dbo.TicketReply', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TicketReply (
        ReplyID      BIGINT IDENTITY(1, 1) NOT NULL,
        TicketID     BIGINT         NOT NULL,
        ReplyText    NVARCHAR(MAX)  NOT NULL,
        ReplyStatus  NVARCHAR(100)  NULL,
        UserID       BIGINT         NOT NULL,
        ReplyDate    DATETIME       NOT NULL CONSTRAINT DF_TicketReply_ReplyDate DEFAULT (GETDATE()),
        Attachment   NVARCHAR(510)  NULL,
        IP           NVARCHAR(50)   NULL,
        IsActive     BIT            NOT NULL CONSTRAINT DF_TicketReply_IsActive DEFAULT (1),
        CONSTRAINT PK_TicketReply PRIMARY KEY CLUSTERED (ReplyID)
    );

    CREATE NONCLUSTERED INDEX IX_TicketReply_TicketID ON dbo.TicketReply (TicketID, ReplyDate);
END
GO

IF OBJECT_ID('dbo.TicketEntryOrg', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TicketEntryOrg (
        TicketEntryOrgID BIGINT IDENTITY(1, 1) NOT NULL,
        TicketID         BIGINT NOT NULL,
        OrgID            BIGINT NOT NULL,
        CONSTRAINT PK_TicketEntryOrg PRIMARY KEY CLUSTERED (TicketEntryOrgID),
        CONSTRAINT UQ_TicketEntryOrg UNIQUE (TicketID, OrgID)
    );

    CREATE NONCLUSTERED INDEX IX_TicketEntryOrg_OrgID ON dbo.TicketEntryOrg (OrgID);
END
GO

IF OBJECT_ID('dbo.TicketModuleMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TicketModuleMaster (
        TicketModuleID BIGINT IDENTITY(1, 1) NOT NULL,
        ModuleName     NVARCHAR(200) NOT NULL,
        SortOrder      INT           NOT NULL CONSTRAINT DF_TicketModuleMaster_SortOrder DEFAULT (0),
        IsActive       BIT           NOT NULL CONSTRAINT DF_TicketModuleMaster_IsActive DEFAULT (1),
        CONSTRAINT PK_TicketModuleMaster PRIMARY KEY CLUSTERED (TicketModuleID)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TicketModuleMaster)
BEGIN
    INSERT INTO dbo.TicketModuleMaster (ModuleName, SortOrder, IsActive)
    VALUES
        (N'Donation', 1, 1),
        (N'Audit', 2, 1),
        (N'Employee', 3, 1),
        (N'Leave', 4, 1),
        (N'Academic', 5, 1),
        (N'Master Data', 6, 1),
        (N'General', 7, 1);
END
GO

IF COL_LENGTH('dbo.TicketEntry', 'TicketNo') IS NULL
    ALTER TABLE dbo.TicketEntry ADD TicketNo NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'Subject') IS NULL
    ALTER TABLE dbo.TicketEntry ADD Subject NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'Module') IS NULL
    ALTER TABLE dbo.TicketEntry ADD Module NVARCHAR(200) NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'Priority') IS NULL
    ALTER TABLE dbo.TicketEntry ADD Priority NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'ReplyRequired') IS NULL
    ALTER TABLE dbo.TicketEntry ADD ReplyRequired NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'SubmittedDate') IS NULL
    ALTER TABLE dbo.TicketEntry ADD SubmittedDate DATETIME NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'SentDate') IS NULL
    ALTER TABLE dbo.TicketEntry ADD SentDate DATETIME NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'ReadDate') IS NULL
    ALTER TABLE dbo.TicketEntry ADD ReadDate DATETIME NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'ClosedDate') IS NULL
    ALTER TABLE dbo.TicketEntry ADD ClosedDate DATETIME NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'ClosedByUserID') IS NULL
    ALTER TABLE dbo.TicketEntry ADD ClosedByUserID BIGINT NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'LastReplyDate') IS NULL
    ALTER TABLE dbo.TicketEntry ADD LastReplyDate DATETIME NULL;
GO

IF COL_LENGTH('dbo.TicketEntry', 'Amount') IS NOT NULL
BEGIN
    DECLARE @DropAmountSql NVARCHAR(200);
    SET @DropAmountSql = N'ALTER TABLE dbo.TicketEntry DROP CONSTRAINT ' +
        (SELECT TOP 1 dc.name
         FROM sys.default_constraints dc
         INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
         WHERE dc.parent_object_id = OBJECT_ID('dbo.TicketEntry')
           AND c.name = 'Amount');
    IF @DropAmountSql IS NOT NULL
        EXEC sp_executesql @DropAmountSql;

    ALTER TABLE dbo.TicketEntry DROP COLUMN Amount;
END
GO

UPDATE dbo.TicketStatusMaster
SET StatusName = N'Open', StatusNameMr = N'खुले', SortOrder = 1
WHERE TicketStatusID = 1;

UPDATE dbo.TicketStatusMaster
SET StatusName = N'Waiting for Reply', StatusNameMr = N'प्रत्युत्तराची वाट', SortOrder = 2
WHERE TicketStatusID = 2;

UPDATE dbo.TicketStatusMaster
SET StatusName = N'Replied', StatusNameMr = N'उत्तर दिले', SortOrder = 3
WHERE TicketStatusID = 3;

UPDATE dbo.TicketStatusMaster
SET StatusName = N'Closed', StatusNameMr = N'बंद', SortOrder = 4
WHERE TicketStatusID = 4;
GO

UPDATE te
SET te.SubmittedDate = te.CreatedDate
FROM dbo.TicketEntry te
WHERE te.SubmittedDate IS NULL;
GO

INSERT INTO dbo.TicketEntryOrg (TicketID, OrgID)
SELECT te.TicketID, te.OrgID
FROM dbo.TicketEntry te
WHERE te.IsActive = 1
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.TicketEntryOrg teo
      WHERE teo.TicketID = te.TicketID
        AND teo.OrgID = te.OrgID
  );
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetUserContext
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @UserRoleID INT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @CanRaiseTicket BIT = 0;

    SELECT
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT TOP 1
        @SansthaOrgID = s.OrgID
    FROM dbo.OrgMaster s
    WHERE s.Status = 1
      AND s.OrgID = s.UnderOrgID
      AND (
          s.SchoolCode = @UserSchoolCode
          OR EXISTS (
              SELECT 1
              FROM dbo.OrgMaster sch
              WHERE sch.SchoolCode = @UserSchoolCode
                AND sch.Status = 1
                AND sch.UnderOrgID = s.OrgID
          )
      )
    ORDER BY s.OrgID;

    IF @SansthaOrgID IS NULL
    BEGIN
        SELECT @SansthaOrgID = om.UnderOrgID
        FROM dbo.OrgMaster om
        WHERE om.OrgID = @UserOrgID
          AND om.Status = 1;

        IF @SansthaOrgID IS NULL
            SET @SansthaOrgID = @UserOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND s.Status = 1
    )
    AND (
        @UserOrgID = @SansthaOrgID
        OR @UserSchoolCode IS NULL
    )
        SET @IsSansthaUser = 1;

    IF @UserRoleID IN (1, 2)
        SET @CanRaiseTicket = 1;

    SELECT
        @IsSansthaUser AS IsSansthaUser,
        @CanRaiseTicket AS CanRaiseTicket,
        @UserID AS UserID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetModules
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        tm.TicketModuleID,
        tm.ModuleName,
        tm.SortOrder
    FROM dbo.TicketModuleMaster tm
    WHERE tm.IsActive = 1
    ORDER BY tm.SortOrder, tm.TicketModuleID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetStatuses
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ts.TicketStatusID,
        ts.StatusName,
        ts.StatusNameMr,
        ts.SortOrder
    FROM dbo.TicketStatusMaster ts
    WHERE ts.IsActive = 1
    ORDER BY ts.SortOrder, ts.TicketStatusID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetList
    @OrgID BIGINT = NULL,
    @UserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @SansthaOrgID BIGINT;

    IF @UserID IS NOT NULL
    BEGIN
        SELECT
            @UserOrgID = um.OrgID,
            @UserSchoolCode = um.SchoolCode
        FROM dbo.UserMaster um
        WHERE um.UserID = @UserID
          AND um.IsActive = 1;

        SELECT TOP 1
            @SansthaOrgID = s.OrgID
        FROM dbo.OrgMaster s
        WHERE s.Status = 1
          AND s.OrgID = s.UnderOrgID
          AND (
              s.SchoolCode = @UserSchoolCode
              OR EXISTS (
                  SELECT 1
                  FROM dbo.OrgMaster sch
                  WHERE sch.SchoolCode = @UserSchoolCode
                    AND sch.Status = 1
                    AND sch.UnderOrgID = s.OrgID
              )
          )
        ORDER BY s.OrgID;

        IF @SansthaOrgID IS NULL
        BEGIN
            SELECT @SansthaOrgID = om.UnderOrgID
            FROM dbo.OrgMaster om
            WHERE om.OrgID = @UserOrgID
              AND om.Status = 1;

            IF @SansthaOrgID IS NULL
                SET @SansthaOrgID = @UserOrgID;
        END

        IF EXISTS (
            SELECT 1
            FROM dbo.OrgMaster s
            WHERE s.OrgID = @SansthaOrgID
              AND s.OrgID = s.UnderOrgID
              AND s.Status = 1
        )
        AND (
            @UserOrgID = @SansthaOrgID
            OR @UserSchoolCode IS NULL
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
              INNER JOIN dbo.OrgMaster sch ON sch.OrgID = teo.OrgID
              WHERE teo.TicketID = te.TicketID
                AND (
                    teo.OrgID = @UserOrgID
                    OR sch.SchoolCode = @UserSchoolCode
                )
          )
      )
    ORDER BY te.TicketDate DESC, te.TicketID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetById
    @TicketID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

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
        schools.SchoolNames,
        schools.OrgIDs
    FROM dbo.TicketEntry te
    INNER JOIN dbo.OrgMaster om ON om.OrgID = te.OrgID
    INNER JOIN dbo.TicketStatusMaster ts ON ts.TicketStatusID = te.TicketStatusID
    LEFT JOIN dbo.UserMaster um ON um.UserID = te.UserID
    OUTER APPLY (
        SELECT
            STRING_AGG(sch.OrganizationName, N', ') WITHIN GROUP (ORDER BY sch.OrganizationName) AS SchoolNames,
            STRING_AGG(CAST(teo.OrgID AS NVARCHAR(20)), N',') WITHIN GROUP (ORDER BY teo.OrgID) AS OrgIDs
        FROM dbo.TicketEntryOrg teo
        INNER JOIN dbo.OrgMaster sch ON sch.OrgID = teo.OrgID
        WHERE teo.TicketID = te.TicketID
    ) schools
    WHERE te.TicketID = @TicketID
      AND te.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetReplies
    @TicketID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        tr.ReplyID,
        tr.TicketID,
        tr.ReplyText,
        tr.ReplyStatus,
        tr.UserID,
        tr.ReplyDate,
        tr.Attachment,
        um.AppUserName AS UserCode
    FROM dbo.TicketReply tr
    LEFT JOIN dbo.UserMaster um ON um.UserID = tr.UserID
    WHERE tr.TicketID = @TicketID
      AND tr.IsActive = 1
    ORDER BY tr.ReplyDate, tr.ReplyID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetPendingNotifications
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @CanRaiseTicket BIT = 0;
    DECLARE @UserRoleID INT;

    SELECT
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode,
        @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    IF @UserRoleID IN (1, 2)
        SET @CanRaiseTicket = 1;

    SELECT
        te.TicketID,
        te.TicketNo,
        te.Subject,
        te.Description,
        te.Module,
        te.Priority,
        te.ReplyRequired,
        te.TicketStatusID,
        te.UserID AS CreatedByUserID,
        te.SubmittedDate,
        te.SentDate,
        ts.StatusName,
        ts.StatusNameMr,
        schools.SchoolNames
    FROM dbo.TicketEntry te
    INNER JOIN dbo.TicketStatusMaster ts ON ts.TicketStatusID = te.TicketStatusID
    OUTER APPLY (
        SELECT STRING_AGG(sch.OrganizationName, N', ') WITHIN GROUP (ORDER BY sch.OrganizationName) AS SchoolNames
        FROM dbo.TicketEntryOrg teo
        INNER JOIN dbo.OrgMaster sch ON sch.OrgID = teo.OrgID
        WHERE teo.TicketID = te.TicketID
    ) schools
    WHERE te.IsActive = 1
      AND ts.StatusName <> N'Closed'
      AND te.UserID <> @UserID
      AND @CanRaiseTicket = 0
      AND te.ReplyRequired IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM dbo.TicketEntryOrg teo
          INNER JOIN dbo.OrgMaster sch ON sch.OrgID = teo.OrgID
          WHERE teo.TicketID = te.TicketID
            AND (
                teo.OrgID = @UserOrgID
                OR sch.SchoolCode = @UserSchoolCode
            )
      )
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.TicketReply tr
          WHERE tr.TicketID = te.TicketID
            AND tr.UserID = @UserID
            AND tr.IsActive = 1
      )
    ORDER BY te.SubmittedDate DESC, te.TicketID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_MarkRead
    @TicketID BIGINT,
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE te
    SET te.ReadDate = GETDATE(),
        te.ModifyDate = GETDATE()
    FROM dbo.TicketEntry te
    WHERE te.TicketID = @TicketID
      AND te.IsActive = 1
      AND te.ReadDate IS NULL;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_Save
    @TicketID BIGINT = NULL OUTPUT,
    @OrgIDs NVARCHAR(MAX),
    @TicketDate DATETIME,
    @Subject NVARCHAR(500) = NULL,
    @Description NVARCHAR(MAX) = NULL,
    @Module NVARCHAR(200) = NULL,
    @Priority NVARCHAR(20) = NULL,
    @ReplyRequired NVARCHAR(20) = NULL,
    @TicketStatusID BIGINT = NULL,
    @Attachment NVARCHAR(510) = NULL,
    @UserID BIGINT,
    @IP NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OrgIDs IS NULL OR LTRIM(RTRIM(@OrgIDs)) = N''
        THROW 50001, N'At least one school is required.', 1;

    DECLARE @PrimaryOrgID BIGINT;
  SELECT TOP 1 @PrimaryOrgID = TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT)
    FROM STRING_SPLIT(@OrgIDs, N',')
    WHERE TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT) IS NOT NULL
    ORDER BY TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT);

    IF @PrimaryOrgID IS NULL
        THROW 50002, N'Invalid school selection.', 1;

    DECLARE @OpenStatusID BIGINT;
    SELECT TOP 1 @OpenStatusID = ts.TicketStatusID
    FROM dbo.TicketStatusMaster ts
    WHERE ts.StatusName = N'Open'
      AND ts.IsActive = 1
    ORDER BY ts.TicketStatusID;

    IF @TicketStatusID IS NULL OR @TicketStatusID = 0
        SET @TicketStatusID = @OpenStatusID;

    BEGIN TRANSACTION;

    IF @TicketID IS NULL OR @TicketID = 0
    BEGIN
        DECLARE @NextNo INT;
        SELECT @NextNo = ISNULL(MAX(TRY_CAST(RIGHT(te.TicketNo, 5) AS INT)), 0) + 1
        FROM dbo.TicketEntry te
        WHERE te.TicketNo LIKE N'TK-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + N'-%';

        DECLARE @TicketNo NVARCHAR(50) = N'TK-' + CAST(YEAR(GETDATE()) AS NVARCHAR(4)) + N'-' + RIGHT(N'00000' + CAST(@NextNo AS NVARCHAR(5)), 5);

        INSERT INTO dbo.TicketEntry (
            OrgID,
            TicketNo,
            TicketDate,
            Subject,
            Description,
            Module,
            Priority,
            ReplyRequired,
            TicketStatusID,
            Attachment,
            UserID,
            CreatedDate,
            ModifyDate,
            SubmittedDate,
            SentDate,
            IP,
            IsActive
        )
        VALUES (
            @PrimaryOrgID,
            @TicketNo,
            @TicketDate,
            @Subject,
            @Description,
            @Module,
            @Priority,
            @ReplyRequired,
            @TicketStatusID,
            @Attachment,
            @UserID,
            GETDATE(),
            GETDATE(),
            GETDATE(),
            GETDATE(),
            @IP,
            1
        );

        SET @TicketID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.TicketEntry
        SET
            OrgID = @PrimaryOrgID,
            TicketDate = @TicketDate,
            Subject = @Subject,
            Description = @Description,
            Module = @Module,
            Priority = @Priority,
            ReplyRequired = @ReplyRequired,
            Attachment = @Attachment,
            ModifyDate = GETDATE(),
            IP = @IP
        WHERE TicketID = @TicketID
          AND IsActive = 1
          AND UserID = @UserID;
    END

    DELETE teo
    FROM dbo.TicketEntryOrg teo
    WHERE teo.TicketID = @TicketID;

    INSERT INTO dbo.TicketEntryOrg (TicketID, OrgID)
    SELECT DISTINCT @TicketID, TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT)
    FROM STRING_SPLIT(@OrgIDs, N',')
    WHERE TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT) IS NOT NULL;

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_AddReply
    @TicketID BIGINT,
    @ReplyText NVARCHAR(MAX),
    @ReplyStatus NVARCHAR(100) = NULL,
    @Attachment NVARCHAR(510) = NULL,
    @UserID BIGINT,
    @IP NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @ReplyText IS NULL OR LTRIM(RTRIM(@ReplyText)) = N''
        THROW 50003, N'Reply is required.', 1;

    DECLARE @CreatorUserID BIGINT;
    DECLARE @CurrentStatusName NVARCHAR(100);

    SELECT
        @CreatorUserID = te.UserID,
        @CurrentStatusName = ts.StatusName
    FROM dbo.TicketEntry te
    INNER JOIN dbo.TicketStatusMaster ts ON ts.TicketStatusID = te.TicketStatusID
    WHERE te.TicketID = @TicketID
      AND te.IsActive = 1;

    IF @CreatorUserID IS NULL
        THROW 50004, N'Ticket not found.', 1;

    IF @CurrentStatusName = N'Closed'
        THROW 50005, N'Ticket is already closed.', 1;

    DECLARE @WaitingStatusID BIGINT;
    DECLARE @RepliedStatusID BIGINT;

    SELECT TOP 1 @WaitingStatusID = ts.TicketStatusID
    FROM dbo.TicketStatusMaster ts
    WHERE ts.StatusName = N'Waiting for Reply'
      AND ts.IsActive = 1
    ORDER BY ts.TicketStatusID;

    SELECT TOP 1 @RepliedStatusID = ts.TicketStatusID
    FROM dbo.TicketStatusMaster ts
    WHERE ts.StatusName = N'Replied'
      AND ts.IsActive = 1
    ORDER BY ts.TicketStatusID;

    BEGIN TRANSACTION;

    INSERT INTO dbo.TicketReply (
        TicketID,
        ReplyText,
        ReplyStatus,
        UserID,
        ReplyDate,
        Attachment,
        IP,
        IsActive
    )
    VALUES (
        @TicketID,
        @ReplyText,
        @ReplyStatus,
        @UserID,
        GETDATE(),
        @Attachment,
        @IP,
        1
    );

    UPDATE te
    SET
        te.LastReplyDate = GETDATE(),
        te.ModifyDate = GETDATE(),
        te.TicketStatusID = CASE
            WHEN @UserID = @CreatorUserID THEN @WaitingStatusID
            ELSE @RepliedStatusID
        END
    FROM dbo.TicketEntry te
    WHERE te.TicketID = @TicketID;

    COMMIT TRANSACTION;

    SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS ReplyID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_Close
    @TicketID BIGINT,
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CreatorUserID BIGINT;
    DECLARE @ClosedStatusID BIGINT;

    SELECT @CreatorUserID = te.UserID
    FROM dbo.TicketEntry te
    WHERE te.TicketID = @TicketID
      AND te.IsActive = 1;

    IF @CreatorUserID IS NULL
        THROW 50006, N'Ticket not found.', 1;

    IF @CreatorUserID <> @UserID
        THROW 50007, N'Only the ticket creator can close this ticket.', 1;

    SELECT TOP 1 @ClosedStatusID = ts.TicketStatusID
    FROM dbo.TicketStatusMaster ts
    WHERE ts.StatusName = N'Closed'
      AND ts.IsActive = 1
    ORDER BY ts.TicketStatusID;

    UPDATE te
    SET
        te.TicketStatusID = @ClosedStatusID,
        te.ClosedDate = GETDATE(),
        te.ClosedByUserID = @UserID,
        te.ModifyDate = GETDATE()
    FROM dbo.TicketEntry te
    WHERE te.TicketID = @TicketID
      AND te.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_Delete
    @TicketID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.TicketEntry
    SET IsActive = 0,
        ModifyDate = GETDATE()
    WHERE TicketID = @TicketID;
END
GO

PRINT N'Ticket Management V2 migration complete.';
GO
