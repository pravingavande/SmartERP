-- Academic & Event Calendar stored procedures
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Holiday_GetByDateRange
    @FromDate DATE,
    @ToDate   DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        h.HolidayId,
        h.HolidayDate,
        h.NameMr,
        h.NameEn,
        h.HolidayType,
        h.Color,
        h.Year
    FROM dbo.HolidayMaster h
    WHERE h.HolidayDate >= @FromDate
      AND h.HolidayDate <= @ToDate
    ORDER BY h.HolidayDate, h.HolidayId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Holiday_Save
    @HolidayId   INT = NULL OUTPUT,
    @HolidayDate DATE,
    @NameMr      NVARCHAR(200),
    @NameEn      NVARCHAR(200),
    @HolidayType NVARCHAR(30),
    @Color       NVARCHAR(20),
    @Year        INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @HolidayId IS NULL OR @HolidayId = 0
    BEGIN
        INSERT INTO dbo.HolidayMaster (HolidayDate, NameMr, NameEn, HolidayType, Color, Year)
        VALUES (@HolidayDate, @NameMr, @NameEn, @HolidayType, @Color, @Year);

        SET @HolidayId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.HolidayMaster
        SET HolidayDate = @HolidayDate,
            NameMr = @NameMr,
            NameEn = @NameEn,
            HolidayType = @HolidayType,
            Color = @Color,
            Year = @Year
        WHERE HolidayId = @HolidayId;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Holiday_Delete
    @HolidayId INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.HolidayMaster
    WHERE HolidayId = @HolidayId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Festival_GetByDateRange
    @FromDate DATE,
    @ToDate   DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        f.FestivalId,
        f.FestivalDate,
        f.NameMr,
        f.NameEn,
        f.Color,
        f.Year
    FROM dbo.FestivalMaster f
    WHERE f.FestivalDate >= @FromDate
      AND f.FestivalDate <= @ToDate
    ORDER BY f.FestivalDate, f.FestivalId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Festival_Save
    @FestivalId   INT = NULL OUTPUT,
    @FestivalDate DATE,
    @NameMr       NVARCHAR(200),
    @NameEn       NVARCHAR(200),
    @Color        NVARCHAR(20),
    @Year         INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @FestivalId IS NULL OR @FestivalId = 0
    BEGIN
        INSERT INTO dbo.FestivalMaster (FestivalDate, NameMr, NameEn, Color, Year)
        VALUES (@FestivalDate, @NameMr, @NameEn, @Color, @Year);

        SET @FestivalId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.FestivalMaster
        SET FestivalDate = @FestivalDate,
            NameMr = @NameMr,
            NameEn = @NameEn,
            Color = @Color,
            Year = @Year
        WHERE FestivalId = @FestivalId;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Festival_Delete
    @FestivalId INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.FestivalMaster
    WHERE FestivalId = @FestivalId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_EventType_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        et.EventTypeId,
        et.Code,
        et.NameEn,
        et.NameMr,
        et.DefaultColor,
        et.SortOrder
    FROM dbo.EventTypes et
    WHERE et.IsActive = 1
    ORDER BY et.SortOrder, et.EventTypeId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetByDateRange
    @FromDate DATE,
    @ToDate   DATE,
    @OrgID    INT = NULL,
    @Search   NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.EventId,
        e.Title,
        e.Description,
        e.EventDate,
        e.StartTime,
        e.EndTime,
        e.IsAllDay,
        e.EventTypeId,
        et.NameMr AS EventTypeNameMr,
        et.NameEn AS EventTypeNameEn,
        et.DefaultColor AS EventTypeColor,
        e.Priority,
        e.Location,
        e.OrganizerUserId,
        e.OrganizerName,
        e.Color,
        e.Status,
        e.Notes,
        e.OrgID,
        e.SchoolCode,
        e.CreatedByUserId,
        e.CreatedAt,
        e.UpdatedAt
    FROM dbo.Events e
    LEFT JOIN dbo.EventTypes et ON et.EventTypeId = e.EventTypeId
    WHERE e.EventDate >= @FromDate
      AND e.EventDate <= @ToDate
      AND (@OrgID IS NULL OR e.OrgID = @OrgID OR e.OrgID IS NULL)
      AND (
          @Search IS NULL
          OR LEN(LTRIM(RTRIM(@Search))) = 0
          OR e.Title LIKE N'%' + @Search + N'%'
          OR e.Location LIKE N'%' + @Search + N'%'
          OR e.OrganizerName LIKE N'%' + @Search + N'%'
      )
    ORDER BY e.EventDate, e.StartTime, e.EventId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_GetById
    @EventId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.EventId,
        e.Title,
        e.Description,
        e.EventDate,
        e.StartTime,
        e.EndTime,
        e.IsAllDay,
        e.EventTypeId,
        et.NameMr AS EventTypeNameMr,
        et.NameEn AS EventTypeNameEn,
        et.DefaultColor AS EventTypeColor,
        e.Priority,
        e.Location,
        e.OrganizerUserId,
        e.OrganizerName,
        e.Color,
        e.Status,
        e.Notes,
        e.OrgID,
        e.SchoolCode,
        e.CreatedByUserId,
        e.CreatedAt,
        e.UpdatedAt
    FROM dbo.Events e
    LEFT JOIN dbo.EventTypes et ON et.EventTypeId = e.EventTypeId
    WHERE e.EventId = @EventId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_Save
    @EventId           INT = NULL OUTPUT,
    @Title             NVARCHAR(250),
    @Description       NVARCHAR(MAX) = NULL,
    @EventDate         DATE,
    @StartTime         TIME(0) = NULL,
    @EndTime           TIME(0) = NULL,
    @IsAllDay          BIT = 0,
    @EventTypeId       INT = NULL,
    @Priority          NVARCHAR(20),
    @Location          NVARCHAR(500) = NULL,
    @OrganizerUserId   BIGINT = NULL,
    @OrganizerName     NVARCHAR(200) = NULL,
    @Color             NVARCHAR(20) = NULL,
    @Status            NVARCHAR(50),
    @Notes             NVARCHAR(MAX) = NULL,
    @OrgID             INT = NULL,
    @SchoolCode        BIGINT = NULL,
    @CreatedByUserId   BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @EventId IS NULL OR @EventId = 0
    BEGIN
        INSERT INTO dbo.Events (
            Title, Description, EventDate, StartTime, EndTime, IsAllDay,
            EventTypeId, Priority, Location, OrganizerUserId, OrganizerName,
            Color, Status, Notes, OrgID, SchoolCode, CreatedByUserId
        )
        VALUES (
            @Title, @Description, @EventDate, @StartTime, @EndTime, @IsAllDay,
            @EventTypeId, @Priority, @Location, @OrganizerUserId, @OrganizerName,
            @Color, @Status, @Notes, @OrgID, @SchoolCode, @CreatedByUserId
        );

        SET @EventId = SCOPE_IDENTITY();
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
            EventTypeId = @EventTypeId,
            Priority = @Priority,
            Location = @Location,
            OrganizerUserId = @OrganizerUserId,
            OrganizerName = @OrganizerName,
            Color = @Color,
            Status = @Status,
            Notes = @Notes,
            OrgID = @OrgID,
            SchoolCode = @SchoolCode,
            UpdatedAt = SYSUTCDATETIME()
        WHERE EventId = @EventId;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Event_Delete
    @EventId INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.Events
    WHERE EventId = @EventId;
END
GO

PRINT N'Calendar procedures created.';
GO
