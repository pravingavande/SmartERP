-- Designation import: show legacy/template rows for org 1 source list
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.DesignationMaster', 'UnderOrgID') IS NULL
BEGIN
    ALTER TABLE dbo.DesignationMaster ADD UnderOrgID BIGINT NULL;
    PRINT 'Added DesignationMaster.UnderOrgID';
END
GO

UPDATE dbo.DesignationMaster
SET UnderOrgID = 1
WHERE UnderOrgID IS NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetMaster
    @UnderOrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        dm.UnderOrgID,
        dm.SrNo,
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
    ORDER BY dm.SrNo, dm.DesignationName, dm.DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_GetList
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dm.DesignationID,
        dm.UnderOrgID,
        dm.SrNo,
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
    ORDER BY dm.SrNo, dm.DesignationName, dm.DesignationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_Import
    @DestinationUnderOrgID BIGINT,
    @DesignationIdsJson NVARCHAR(MAX),
    @ImportedCount INT = 0 OUTPUT,
    @SkippedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @ImportedCount = 0;
    SET @SkippedCount = 0;

    IF @DestinationUnderOrgID IS NULL OR @DestinationUnderOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @DestinationUnderOrgID = 1
    BEGIN
        RAISERROR('Cannot import into the source organization.', 16, 1);
        RETURN;
    END

    IF @DesignationIdsJson IS NULL OR LTRIM(RTRIM(@DesignationIdsJson)) = N''
       OR LTRIM(RTRIM(@DesignationIdsJson)) = N'[]'
    BEGIN
        RAISERROR('Select at least one designation to import.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @Name NVARCHAR(200);
    DECLARE @Short NVARCHAR(50);
    DECLARE @LeaveYear INT;
    DECLARE @HMOrPrincipal BIT;
    DECLARE @IsActive BIT;
    DECLARE @NextSrNo BIGINT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT
        LTRIM(RTRIM(dm.DesignationName)),
        dm.DesignationNameShort,
        dm.LeaveYear,
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT),
        ISNULL(dm.IsActive, 1)
    FROM OPENJSON(@DesignationIdsJson) d
    INNER JOIN dbo.DesignationMaster dm
        ON dm.DesignationID = TRY_CAST(d.value AS BIGINT)
    WHERE TRY_CAST(d.value AS BIGINT) IS NOT NULL
    ORDER BY dm.SrNo, dm.DesignationID;

    OPEN src;
    FETCH NEXT FROM src INTO @Name, @Short, @LeaveYear, @HMOrPrincipal, @IsActive;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Name IS NULL OR @Name = N''
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE IF EXISTS (
            SELECT 1
            FROM dbo.DesignationMaster dest
            WHERE ISNULL(dest.UnderOrgID, 1) = @DestinationUnderOrgID
              AND dest.DesignationName = @Name
        )
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE
        BEGIN
            SELECT @NextSrNo = ISNULL(MAX(dm.SrNo), 0) + 1
            FROM dbo.DesignationMaster dm WITH (UPDLOCK, HOLDLOCK)
            WHERE ISNULL(dm.UnderOrgID, 1) = @DestinationUnderOrgID;

            INSERT INTO dbo.DesignationMaster (
                UnderOrgID,
                SrNo,
                DesignationName,
                DesignationNameShort,
                LeaveYear,
                HMOrPrincipal,
                IsActive
            )
            VALUES (
                @DestinationUnderOrgID,
                @NextSrNo,
                @Name,
                @Short,
                @LeaveYear,
                @HMOrPrincipal,
                @IsActive
            );

            SET @ImportedCount = @ImportedCount + 1;
        END

        FETCH NEXT FROM src INTO @Name, @Short, @LeaveYear, @HMOrPrincipal, @IsActive;
    END

    CLOSE src;
    DEALLOCATE src;

    COMMIT TRANSACTION;

    SELECT
        @ImportedCount AS ImportedCount,
        @SkippedCount AS SkippedCount;
END
GO

PRINT '100_Designation_Import_Source_Fix applied.';
GO
