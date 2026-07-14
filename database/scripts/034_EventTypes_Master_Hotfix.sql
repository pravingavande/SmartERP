-- Hotfix: Event Types Master save (POST /api/eventcalendar/event-types)
-- Run on live DB if save returns 500 — safe to re-run (idempotent).
-- Full module: database/scripts/033_Event_Management_V2.sql

USE SmartERP;
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

IF COL_LENGTH('dbo.EventTypes', 'NameMr') IS NOT NULL
   OR COL_LENGTH('dbo.EventTypes', 'NameEn') IS NOT NULL
BEGIN
    UPDATE et
    SET
        et.EventType = COALESCE(et.EventType, et.NameMr, et.NameEn),
        et.SrNo = COALESCE(et.SrNo, et.SortOrder, et.EventTypeId)
    FROM dbo.EventTypes et
    WHERE et.EventType IS NULL OR et.SrNo IS NULL;
END
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
    SELECT 1 FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID('dbo.EventTypes') AND kc.name = 'UQ_EventTypes_Code'
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
    WHERE dc.parent_object_id = OBJECT_ID('dbo.EventTypes') AND c.name = 'SortOrder';
    IF @DropSortSql IS NOT NULL EXEC sp_executesql @DropSortSql;
    ALTER TABLE dbo.EventTypes DROP COLUMN SortOrder;
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
    UPDATE dbo.EventTypes SET IsActive = 0 WHERE EventTypeId = @EventTypeID;
END
GO

PRINT N'Event Types Master hotfix applied (034).';
GO
