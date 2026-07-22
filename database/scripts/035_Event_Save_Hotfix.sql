-- Hotfix: Event Calendar save (POST /api/eventcalendar/events)
-- Run on live DB if event save returns 500 — safe to re-run (idempotent).
-- Full module: database/scripts/033_Event_Management_V2.sql

USE SmartERP;
GO

IF OBJECT_ID('dbo.LocationMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LocationMaster (
        LocationID   INT IDENTITY(1, 1) NOT NULL,
        UnderOrgID   BIGINT         NOT NULL,
        LocationName NVARCHAR(300)  NOT NULL,
        IsActive     BIT            NOT NULL CONSTRAINT DF_LocationMaster_IsActive DEFAULT (1),
        CONSTRAINT PK_LocationMaster PRIMARY KEY CLUSTERED (LocationID)
    );
    CREATE NONCLUSTERED INDEX IX_LocationMaster_UnderOrgID ON dbo.LocationMaster (UnderOrgID);
END
GO

IF OBJECT_ID('dbo.EventOrg', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EventOrg (
        EventOrgID INT IDENTITY(1, 1) NOT NULL,
        EventID    INT    NOT NULL,
        OrgID      BIGINT NOT NULL,
        CONSTRAINT PK_EventOrg PRIMARY KEY CLUSTERED (EventOrgID),
        CONSTRAINT UQ_EventOrg UNIQUE (EventID, OrgID)
    );
    CREATE NONCLUSTERED INDEX IX_EventOrg_OrgID ON dbo.EventOrg (OrgID);
END
GO

IF COL_LENGTH('dbo.Events', 'LocationID') IS NULL
    ALTER TABLE dbo.Events ADD LocationID INT NULL;
GO

IF COL_LENGTH('dbo.Events', 'UnderOrgID') IS NULL
    ALTER TABLE dbo.Events ADD UnderOrgID BIGINT NULL;
GO

IF COL_LENGTH('dbo.Events', 'EventReporting') IS NULL
    ALTER TABLE dbo.Events ADD EventReporting NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH('dbo.Events', 'EventPhotoAttachment') IS NULL
    ALTER TABLE dbo.Events ADD EventPhotoAttachment NVARCHAR(510) NULL;
GO

IF COL_LENGTH('dbo.Events', 'EventNewsAttachment') IS NULL
    ALTER TABLE dbo.Events ADD EventNewsAttachment NVARCHAR(510) NULL;
GO

IF COL_LENGTH('dbo.Events', 'Priority') IS NOT NULL
BEGIN
    DECLARE @DropPrioritySql NVARCHAR(400);
    SELECT @DropPrioritySql = N'ALTER TABLE dbo.Events DROP CONSTRAINT ' + QUOTENAME(dc.name)
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.Events') AND c.name = 'Priority';
    IF @DropPrioritySql IS NOT NULL EXEC sp_executesql @DropPrioritySql;
    ALTER TABLE dbo.Events DROP COLUMN Priority;
END
GO

IF COL_LENGTH('dbo.Events', 'OrganizerName') IS NOT NULL
    ALTER TABLE dbo.Events DROP COLUMN OrganizerName;
GO

IF COL_LENGTH('dbo.Events', 'OrganizerUserId') IS NOT NULL
    ALTER TABLE dbo.Events DROP COLUMN OrganizerUserId;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetUserContext
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @UserRoleID INT;
    SELECT @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID AND um.IsActive = 1;
    SELECT
        CASE WHEN @UserRoleID IN (1, 2, 3) THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS CanManageEvents,
        @UserRoleID AS UserRoleID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Location_Save
    @LocationID INT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @LocationName NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;
    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
        THROW 51003, N'Organization is required.', 1;
    IF @LocationName IS NULL OR LTRIM(RTRIM(@LocationName)) = N''
        THROW 51004, N'Location name is required.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.LocationMaster lm
        WHERE lm.UnderOrgID = @UnderOrgID
          AND lm.LocationName = LTRIM(RTRIM(@LocationName))
          AND lm.IsActive = 1
          AND (@LocationID IS NULL OR lm.LocationID <> @LocationID)
    )
    BEGIN
        SELECT TOP 1 @LocationID = lm.LocationID
        FROM dbo.LocationMaster lm
        WHERE lm.UnderOrgID = @UnderOrgID
          AND lm.LocationName = LTRIM(RTRIM(@LocationName))
          AND lm.IsActive = 1
        ORDER BY lm.LocationID;
        RETURN;
    END

    IF @LocationID IS NULL OR @LocationID = 0
    BEGIN
        INSERT INTO dbo.LocationMaster (UnderOrgID, LocationName, IsActive)
        VALUES (@UnderOrgID, LTRIM(RTRIM(@LocationName)), 1);
        SET @LocationID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.LocationMaster
        SET UnderOrgID = @UnderOrgID, LocationName = LTRIM(RTRIM(@LocationName))
        WHERE LocationID = @LocationID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetById
    @EventID INT
AS
BEGIN
    SET NOCOUNT ON;
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
    WHERE e.EventId = @EventID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_Save
    @EventID INT = NULL OUTPUT,
    @Title NVARCHAR(250),
    @Description NVARCHAR(MAX) = NULL,
    @EventDate DATE,
    @StartTime TIME(0) = NULL,
    @EndTime TIME(0) = NULL,
    @IsAllDay BIT = 0,
    @EventTypeID INT = NULL,
    @LocationID INT = NULL,
    @Location NVARCHAR(500) = NULL,
    @Color NVARCHAR(20) = NULL,
    @Status NVARCHAR(50),
    @Notes NVARCHAR(MAX) = NULL,
    @UnderOrgID BIGINT = NULL,
    @OrgIDs NVARCHAR(MAX) = NULL,
    @EventReporting NVARCHAR(MAX) = NULL,
    @EventPhotoAttachment NVARCHAR(510) = NULL,
    @EventNewsAttachment NVARCHAR(510) = NULL,
    @OrgID INT = NULL,
    @SchoolCode BIGINT = NULL,
    @CreatedByUserId BIGINT = NULL,
    @CanManageEvents BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @CanManageEvents = 0
        THROW 51005, N'Read-only user cannot save events.', 1;

    IF @OrgIDs IS NULL OR LTRIM(RTRIM(@OrgIDs)) = N''
        THROW 51006, N'At least one school is required.', 1;

    DECLARE @PrimaryOrgID BIGINT;
    SELECT TOP 1 @PrimaryOrgID = TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT)
    FROM STRING_SPLIT(@OrgIDs, N',')
    WHERE TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT) IS NOT NULL
    ORDER BY TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT);

    DECLARE @ExistingDate DATE = NULL;
    IF @EventID IS NOT NULL AND @EventID > 0
    BEGIN
        SELECT @ExistingDate = e.EventDate FROM dbo.Events e WHERE e.EventId = @EventID;
    END

    DECLARE @IsLocked BIT = CASE
        WHEN @ExistingDate IS NOT NULL AND @ExistingDate < CAST(GETDATE() AS DATE) THEN 1
        ELSE 0
    END;

    IF @LocationID IS NULL AND @Location IS NOT NULL AND LTRIM(RTRIM(@Location)) <> N'' AND @UnderOrgID IS NOT NULL
    BEGIN
        EXEC dbo.sp_Location_Save
            @LocationID = @LocationID OUTPUT,
            @UnderOrgID = @UnderOrgID,
            @LocationName = @Location;
    END

    BEGIN TRANSACTION;

    IF @EventID IS NULL OR @EventID = 0
    BEGIN
        INSERT INTO dbo.Events (
            Title, Description, EventDate, StartTime, EndTime, IsAllDay,
            EventTypeId, LocationID, Location, Color, Status, Notes,
            UnderOrgID, OrgID, SchoolCode, EventReporting, EventPhotoAttachment, EventNewsAttachment,
            CreatedByUserId
        )
        VALUES (
            @Title, @Description, @EventDate, @StartTime, @EndTime, @IsAllDay,
            @EventTypeID, @LocationID, @Location, @Color, @Status, @Notes,
            @UnderOrgID, CAST(@PrimaryOrgID AS INT), @SchoolCode, @EventReporting, @EventPhotoAttachment, @EventNewsAttachment,
            @CreatedByUserId
        );
        SET @EventID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        IF @IsLocked = 1
        BEGIN
            UPDATE dbo.Events
            SET EventReporting = @EventReporting,
                EventPhotoAttachment = @EventPhotoAttachment,
                EventNewsAttachment = @EventNewsAttachment,
                UpdatedAt = SYSUTCDATETIME()
            WHERE EventId = @EventID;
        END
        ELSE
        BEGIN
            UPDATE dbo.Events
            SET Title = @Title,
                Description = @Description,
                EventDate = @EventDate,
                StartTime = @StartTime,
                EndTime = @EndTime,
                IsAllDay = @IsAllDay,
                EventTypeId = @EventTypeID,
                LocationID = @LocationID,
                Location = @Location,
                Color = @Color,
                Status = @Status,
                Notes = @Notes,
                UnderOrgID = @UnderOrgID,
                OrgID = CAST(@PrimaryOrgID AS INT),
                SchoolCode = @SchoolCode,
                EventReporting = @EventReporting,
                EventPhotoAttachment = @EventPhotoAttachment,
                EventNewsAttachment = @EventNewsAttachment,
                UpdatedAt = SYSUTCDATETIME()
            WHERE EventId = @EventID;
        END
    END

    IF @IsLocked = 0
    BEGIN
        DELETE eo FROM dbo.EventOrg eo WHERE eo.EventID = @EventID;
        INSERT INTO dbo.EventOrg (EventID, OrgID)
        SELECT DISTINCT @EventID, TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT)
        FROM STRING_SPLIT(@OrgIDs, N',')
        WHERE TRY_CAST(LTRIM(RTRIM(value)) AS BIGINT) IS NOT NULL;
    END

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_Delete
    @EventID INT,
    @CanManageEvents BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @CanManageEvents = 0
        THROW 51007, N'Read-only user cannot delete events.', 1;
    DELETE FROM dbo.EventOrg WHERE EventID = @EventID;
    DELETE FROM dbo.Events WHERE EventId = @EventID;
END
GO

PRINT N'Event save hotfix applied (035).';
GO
