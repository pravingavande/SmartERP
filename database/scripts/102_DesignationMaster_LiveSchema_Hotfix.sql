-- DesignationMaster live schema align + designation CRUD procs (fixes API 500 on /master/designation)
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.DesignationMaster', 'UnderOrgID') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD UnderOrgID BIGINT NULL;
    PRINT 'Added DesignationMaster.UnderOrgID';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'SrNo') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD SrNo BIGINT NULL;
    PRINT 'Added DesignationMaster.SrNo';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'DesignationNameShort') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD DesignationNameShort NVARCHAR(50) NULL;
    PRINT 'Added DesignationMaster.DesignationNameShort';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'LeaveYear') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD LeaveYear INT NULL;
    PRINT 'Added DesignationMaster.LeaveYear';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'HMOrPrincipal') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD HMOrPrincipal BIT NULL;
    PRINT 'Added DesignationMaster.HMOrPrincipal';
END
GO

IF COL_LENGTH('dbo.DesignationMaster', 'IsActive') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD IsActive BIT NULL CONSTRAINT DF_DesignationMaster_IsActive DEFAULT (1);
    PRINT 'Added DesignationMaster.IsActive';
END
GO

UPDATE dbo.DesignationMaster SET UnderOrgID = 1 WHERE UnderOrgID IS NULL;
UPDATE dbo.DesignationMaster SET IsActive = 1 WHERE IsActive IS NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetMaster
    @UnderOrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        ISNULL(dm.UnderOrgID, 1) AS UnderOrgID,
        ISNULL(dm.SrNo, 0) AS SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        ISNULL(dm.IsActive, 1) AS IsActive
    FROM dbo.DesignationMaster dm
    WHERE @UnderOrgID IS NULL
       OR @UnderOrgID = 1
       OR ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
    ORDER BY ISNULL(dm.SrNo, 0), dm.DesignationName, dm.DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetList
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        ISNULL(dm.UnderOrgID, 1) AS UnderOrgID,
        ISNULL(dm.SrNo, 0) AS SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        ISNULL(dm.IsActive, 1) AS IsActive,
        om.OrganizationName
    FROM dbo.DesignationMaster dm
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dm.UnderOrgID
    WHERE @UnderOrgID = 1
       OR ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
    ORDER BY ISNULL(dm.SrNo, 0), dm.DesignationName, dm.DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetById
    @DesignationID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        ISNULL(dm.UnderOrgID, 1) AS UnderOrgID,
        ISNULL(dm.SrNo, 0) AS SrNo,
        dm.DesignationName,
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT) AS HMOrPrincipal,
        ISNULL(dm.IsActive, 1) AS IsActive,
        om.OrganizationName
    FROM dbo.DesignationMaster dm
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dm.UnderOrgID
    WHERE dm.DesignationID = @DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetNextSrNo
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(ISNULL(dm.SrNo, 0)), 0) + 1 AS NextSrNo
    FROM dbo.DesignationMaster dm
    WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID;
END
GO

PRINT '102_DesignationMaster_LiveSchema_Hotfix applied.';
GO
