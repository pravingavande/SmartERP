-- Event Management V2: EventTypes master, LocationMaster, Events enhancements
-- Rules: no SELECT *, no MERGE, no BETWEEN

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

IF COL_LENGTH('dbo.EventTypes', 'UnderOrgID') IS NULL
    ALTER TABLE dbo.EventTypes ADD UnderOrgID BIGINT NULL;
GO

IF COL_LENGTH('dbo.EventTypes', 'SrNo') IS NULL
    ALTER TABLE dbo.EventTypes ADD SrNo INT NULL;
GO

IF COL_LENGTH('dbo.EventTypes', 'EventType') IS NULL
    ALTER TABLE dbo.EventTypes ADD EventType NVARCHAR(200) NULL;
GO

UPDATE et
SET
    et.EventType = COALESCE(et.EventType, et.NameMr, et.NameEn),
    et.SrNo = COALESCE(et.SrNo, et.SortOrder, et.EventTypeId)
FROM dbo.EventTypes et
WHERE et.EventType IS NULL OR et.SrNo IS NULL;
GO

DECLARE @DefaultSansthaOrgID BIGINT;
SELECT TOP 1 @DefaultSansthaOrgID = om.OrgID
FROM dbo.OrgMaster om
WHERE om.Status = 1
  AND om.OrgID = om.UnderOrgID
ORDER BY om.OrgID;

UPDATE dbo.EventTypes
SET UnderOrgID = COALESCE(UnderOrgID, @DefaultSansthaOrgID)
WHERE UnderOrgID IS NULL;
GO

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID('dbo.EventTypes')
      AND kc.name = 'UQ_EventTypes_Code'
)
    ALTER TABLE dbo.EventTypes DROP CONSTRAINT UQ_EventTypes_Code;
GO

IF COL_LENGTH('dbo.EventTypes', 'Code') IS NOT NULL
    ALTER TABLE dbo.EventTypes DROP COLUMN Code;
GO

IF COL_LENGTH('dbo.EventTypes', 'NameEn') IS NOT NULL
    ALTER TABLE dbo.EventTypes DROP COLUMN NameEn;
GO

IF COL_LENGTH('dbo.EventTypes', 'DefaultColor') IS NOT NULL
    ALTER TABLE dbo.EventTypes DROP COLUMN DefaultColor;
GO

IF COL_LENGTH('dbo.EventTypes', 'NameMr') IS NOT NULL
    ALTER TABLE dbo.EventTypes DROP COLUMN NameMr;
GO

IF COL_LENGTH('dbo.EventTypes', 'SortOrder') IS NOT NULL
BEGIN
    DECLARE @DropSortSql NVARCHAR(400);
    SELECT @DropSortSql = N'ALTER TABLE dbo.EventTypes DROP CONSTRAINT ' + QUOTENAME(dc.name)
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.EventTypes')
      AND c.name = 'SortOrder';

    IF @DropSortSql IS NOT NULL
        EXEC sp_executesql @DropSortSql;

    ALTER TABLE dbo.EventTypes DROP COLUMN SortOrder;
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
    WHERE dc.parent_object_id = OBJECT_ID('dbo.Events')
      AND c.name = 'Priority';

    IF @DropPrioritySql IS NOT NULL
        EXEC sp_executesql @DropPrioritySql;

    ALTER TABLE dbo.Events DROP COLUMN Priority;
END
GO

IF COL_LENGTH('dbo.Events', 'OrganizerName') IS NOT NULL
    ALTER TABLE dbo.Events DROP COLUMN OrganizerName;
GO

IF COL_LENGTH('dbo.Events', 'OrganizerUserId') IS NOT NULL
    ALTER TABLE dbo.Events DROP COLUMN OrganizerUserId;
GO

UPDATE dbo.Events
SET Status = N'पूर्ण झाले'
WHERE Status = N'पूर्ण';

UPDATE dbo.Events
SET Status = N'रद्द झाले'
WHERE Status IN (N'रद्द', N'Cancelled');

UPDATE dbo.Events
SET Status = N'नियोजित'
WHERE Status = N'पुढे ढकललेले';
GO

INSERT INTO dbo.EventOrg (EventID, OrgID)
SELECT e.EventId, CAST(e.OrgID AS BIGINT)
FROM dbo.Events e
WHERE e.OrgID IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.EventOrg eo
      WHERE eo.EventID = e.EventId
        AND eo.OrgID = e.OrgID
  );
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetUserContext
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserRoleID INT;

    SELECT @UserRoleID = um.UserRoleID
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT
        CASE WHEN @UserRoleID IN (1, 2, 3) THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS CanManageEvents,
        @UserRoleID AS UserRoleID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_EventType_GetAll
    @UnderOrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        et.EventTypeId AS EventTypeID,
        et.UnderOrgID,
        et.SrNo,
        et.EventType,
        et.IsActive,
        om.OrganizationName AS UnderOrgName
    FROM dbo.EventTypes et
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = et.UnderOrgID
    WHERE et.IsActive = 1
      AND (@UnderOrgID IS NULL OR et.UnderOrgID = @UnderOrgID)
    ORDER BY et.UnderOrgID, et.SrNo, et.EventTypeId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_EventType_GetList
    @UnderOrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        et.EventTypeId AS EventTypeID,
        et.UnderOrgID,
        et.SrNo,
        et.EventType,
        et.IsActive,
        om.OrganizationName AS UnderOrgName
    FROM dbo.EventTypes et
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = et.UnderOrgID
    WHERE @UnderOrgID IS NULL OR et.UnderOrgID = @UnderOrgID
    ORDER BY et.UnderOrgID, et.SrNo, et.EventTypeId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_EventType_Save
    @EventTypeID INT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @EventType NVARCHAR(200),
    @IsActive BIT = 1,
    @UserID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
        THROW 51001, N'Organization is required.', 1;

    IF @EventType IS NULL OR LTRIM(RTRIM(@EventType)) = N''
        THROW 51002, N'Event Type is required.', 1;

    IF @EventTypeID IS NULL OR @EventTypeID = 0
    BEGIN
        DECLARE @NextSrNo INT;
        SELECT @NextSrNo = ISNULL(MAX(et.SrNo), 0) + 1
        FROM dbo.EventTypes et
        WHERE et.UnderOrgID = @UnderOrgID;

        INSERT INTO dbo.EventTypes (UnderOrgID, SrNo, EventType, IsActive)
        VALUES (@UnderOrgID, @NextSrNo, LTRIM(RTRIM(@EventType)), @IsActive);

        SET @EventTypeID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE et
        SET
            et.UnderOrgID = @UnderOrgID,
            et.EventType = LTRIM(RTRIM(@EventType)),
            et.IsActive = @IsActive
        FROM dbo.EventTypes et
        WHERE et.EventTypeId = @EventTypeID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_EventType_Delete
    @EventTypeID INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.EventTypes
    SET IsActive = 0
    WHERE EventTypeId = @EventTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Location_GetList
    @UnderOrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lm.LocationID,
        lm.UnderOrgID,
        lm.LocationName,
        lm.IsActive
    FROM dbo.LocationMaster lm
    WHERE lm.IsActive = 1
      AND lm.UnderOrgID = @UnderOrgID
      AND (
          @Search IS NULL
          OR LEN(LTRIM(RTRIM(@Search))) = 0
          OR lm.LocationName LIKE N'%' + @Search + N'%'
      )
    ORDER BY lm.LocationName, lm.LocationID;
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
        SELECT 1
        FROM dbo.LocationMaster lm
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
        SET UnderOrgID = @UnderOrgID,
            LocationName = LTRIM(RTRIM(@LocationName))
        WHERE LocationID = @LocationID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetPendingReportingCount
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;

    SELECT
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT TOP 1 @SansthaOrgID = s.OrgID
    FROM dbo.OrgMaster s
    WHERE s.Status = 1
      AND s.OrgID = s.UnderOrgID
    ORDER BY s.OrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND s.Status = 1
    )
    AND (@UserOrgID = @SansthaOrgID OR @UserSchoolCode IS NULL)
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
              INNER JOIN dbo.OrgMaster sch ON sch.OrgID = eo.OrgID
              WHERE eo.EventID = e.EventId
                AND (eo.OrgID = @UserOrgID OR sch.SchoolCode = @UserSchoolCode)
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
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;

    SELECT
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT TOP 1 @SansthaOrgID = s.OrgID
    FROM dbo.OrgMaster s
    WHERE s.Status = 1
      AND s.OrgID = s.UnderOrgID
    ORDER BY s.OrgID;

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND s.Status = 1
    )
    AND (@UserOrgID = @SansthaOrgID OR @UserSchoolCode IS NULL)
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
              INNER JOIN dbo.OrgMaster sch ON sch.OrgID = eo.OrgID
              WHERE eo.EventID = e.EventId
                AND (eo.OrgID = @UserOrgID OR sch.SchoolCode = @UserSchoolCode)
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
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @IsSansthaUser BIT = 0;
    DECLARE @SansthaOrgID BIGINT;

    IF @UserID IS NOT NULL
    BEGIN
        SELECT
            @UserOrgID = um.OrgID,
            @UserSchoolCode = um.SchoolCode
        FROM dbo.UserMaster um
        WHERE um.UserID = @UserID
          AND um.IsActive = 1;

        SELECT TOP 1 @SansthaOrgID = s.OrgID
        FROM dbo.OrgMaster s
        WHERE s.Status = 1
          AND s.OrgID = s.UnderOrgID
        ORDER BY s.OrgID;

        IF EXISTS (
            SELECT 1
            FROM dbo.OrgMaster s
            WHERE s.OrgID = @SansthaOrgID
              AND s.OrgID = s.UnderOrgID
              AND s.Status = 1
        )
        AND (@UserOrgID = @SansthaOrgID OR @UserSchoolCode IS NULL)
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
              INNER JOIN dbo.OrgMaster sch ON sch.OrgID = eo.OrgID
              WHERE eo.EventID = e.EventId
                AND (eo.OrgID = @UserOrgID OR sch.SchoolCode = @UserSchoolCode)
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
        SELECT @ExistingDate = e.EventDate
        FROM dbo.Events e
        WHERE e.EventId = @EventID;
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
        DELETE eo
        FROM dbo.EventOrg eo
        WHERE eo.EventID = @EventID;

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

PRINT N'Event Management V2 migration complete.';
GO
