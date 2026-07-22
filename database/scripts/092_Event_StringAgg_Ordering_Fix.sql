-- Fix: "Multiple ordered aggregate functions in the same scope have mutually incompatible orderings"
-- when saving/loading events with multiple schools (STRING_AGG must share the same ORDER BY).
SET NOCOUNT ON;
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

PRINT '092_Event_StringAgg_Ordering_Fix applied.';
GO
