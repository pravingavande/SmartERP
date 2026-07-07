-- Ticket module tables and stored procedures
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

IF OBJECT_ID('dbo.TicketStatusMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TicketStatusMaster (
        TicketStatusID BIGINT IDENTITY(1, 1) NOT NULL,
        StatusName     NVARCHAR(100) NOT NULL,
        StatusNameMr   NVARCHAR(100) NOT NULL,
        SortOrder      INT           NOT NULL CONSTRAINT DF_TicketStatusMaster_SortOrder DEFAULT (0),
        IsActive       BIT           NOT NULL CONSTRAINT DF_TicketStatusMaster_IsActive DEFAULT (1),
        CONSTRAINT PK_TicketStatusMaster PRIMARY KEY CLUSTERED (TicketStatusID)
    );
END
GO

IF OBJECT_ID('dbo.TicketEntry', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TicketEntry (
        TicketID       BIGINT IDENTITY(1, 1) NOT NULL,
        OrgID          BIGINT         NOT NULL,
        TicketDate     DATETIME       NOT NULL,
        Description    NVARCHAR(MAX)  NULL,
        Amount         NUMERIC(18, 2) NOT NULL CONSTRAINT DF_TicketEntry_Amount DEFAULT (0),
        TicketStatusID BIGINT         NOT NULL,
        Attachment     NVARCHAR(510)  NULL,
        UserID         BIGINT         NOT NULL,
        CreatedDate    DATETIME       NOT NULL CONSTRAINT DF_TicketEntry_CreatedDate DEFAULT (GETDATE()),
        ModifyDate     DATETIME       NULL,
        IP             NVARCHAR(50)   NULL,
        IsActive       BIT            NOT NULL CONSTRAINT DF_TicketEntry_IsActive DEFAULT (1),
        CONSTRAINT PK_TicketEntry PRIMARY KEY CLUSTERED (TicketID)
    );

    CREATE NONCLUSTERED INDEX IX_TicketEntry_OrgID ON dbo.TicketEntry (OrgID);
    CREATE NONCLUSTERED INDEX IX_TicketEntry_TicketDate ON dbo.TicketEntry (TicketDate DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TicketStatusMaster)
BEGIN
    INSERT INTO dbo.TicketStatusMaster (StatusName, StatusNameMr, SortOrder, IsActive)
    VALUES
        (N'Pending', N'प्रलंबित', 1, 1),
        (N'In Progress', N'प्रगतीत', 2, 1),
        (N'Completed', N'पूर्ण', 3, 1),
        (N'Cancelled', N'रद्द', 4, 1);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_GetUserContext
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;

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

    SELECT @IsSansthaUser AS IsSansthaUser;
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
        te.OrgID,
        te.TicketDate,
        te.Description,
        te.Amount,
        te.TicketStatusID,
        te.Attachment,
        te.UserID,
        te.CreatedDate,
        te.ModifyDate,
        te.IP,
        om.OrganizationName,
        ts.StatusName,
        ts.StatusNameMr,
        um.AppUserName AS UserCode
    FROM dbo.TicketEntry te
    INNER JOIN dbo.OrgMaster om ON om.OrgID = te.OrgID
    INNER JOIN dbo.TicketStatusMaster ts ON ts.TicketStatusID = te.TicketStatusID
    LEFT JOIN dbo.UserMaster um ON um.UserID = te.UserID
    WHERE te.IsActive = 1
      AND (@OrgID IS NULL OR te.OrgID = @OrgID)
      AND (
          @UserID IS NULL
          OR @IsSansthaUser = 1
          OR te.OrgID = @UserOrgID
          OR om.SchoolCode = @UserSchoolCode
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
        te.OrgID,
        te.TicketDate,
        te.Description,
        te.Amount,
        te.TicketStatusID,
        te.Attachment,
        te.UserID,
        te.CreatedDate,
        te.ModifyDate,
        te.IP,
        om.OrganizationName,
        ts.StatusName,
        ts.StatusNameMr,
        um.AppUserName AS UserCode
    FROM dbo.TicketEntry te
    INNER JOIN dbo.OrgMaster om ON om.OrgID = te.OrgID
    INNER JOIN dbo.TicketStatusMaster ts ON ts.TicketStatusID = te.TicketStatusID
    LEFT JOIN dbo.UserMaster um ON um.UserID = te.UserID
    WHERE te.TicketID = @TicketID
      AND te.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Ticket_Save
    @TicketID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @TicketDate DATETIME,
    @Description NVARCHAR(MAX) = NULL,
    @Amount NUMERIC(18, 2),
    @TicketStatusID BIGINT,
    @Attachment NVARCHAR(510) = NULL,
    @UserID BIGINT,
    @IP NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    IF @TicketID IS NULL OR @TicketID = 0
    BEGIN
        INSERT INTO dbo.TicketEntry (
            OrgID,
            TicketDate,
            Description,
            Amount,
            TicketStatusID,
            Attachment,
            UserID,
            CreatedDate,
            ModifyDate,
            IP,
            IsActive
        )
        VALUES (
            @OrgID,
            @TicketDate,
            @Description,
            @Amount,
            @TicketStatusID,
            @Attachment,
            @UserID,
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
            OrgID = @OrgID,
            TicketDate = @TicketDate,
            Description = @Description,
            Amount = @Amount,
            TicketStatusID = @TicketStatusID,
            Attachment = @Attachment,
            ModifyDate = GETDATE(),
            IP = @IP
        WHERE TicketID = @TicketID
          AND IsActive = 1;
    END

    COMMIT TRANSACTION;
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

PRINT N'Ticket tables and procedures created.';
GO
