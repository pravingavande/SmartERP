-- ============================================================
-- DRHeadMaster Import
-- Copy selected rows from UnderOrgID = 1 to destination org
-- Skip when DRHeadName already exists at destination
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHead_Import
    @DestinationUnderOrgID BIGINT,
    @DRHeadIdsJson NVARCHAR(MAX),
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

    IF @DRHeadIdsJson IS NULL OR LTRIM(RTRIM(@DRHeadIdsJson)) = N''
       OR LTRIM(RTRIM(@DRHeadIdsJson)) = N'[]'
    BEGIN
        RAISERROR('Select at least one donation head to import.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @SourceID BIGINT;
    DECLARE @Name NVARCHAR(200);
    DECLARE @IsActive BIT;
    DECLARE @NextSrNo BIGINT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT
        dh.DRHeadID,
        LTRIM(RTRIM(dh.DRHeadName)),
        ISNULL(dh.IsActive, 1)
    FROM OPENJSON(@DRHeadIdsJson) d
    INNER JOIN dbo.DRHeadMaster dh
        ON dh.DRHeadID = TRY_CAST(d.value AS BIGINT)
    WHERE dh.UnderOrgID = 1
      AND ISNULL(dh.IsActive, 1) = 1
      AND TRY_CAST(d.value AS BIGINT) IS NOT NULL
    ORDER BY dh.SrNo, dh.DRHeadID;

    OPEN src;
    FETCH NEXT FROM src INTO @SourceID, @Name, @IsActive;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Name IS NULL OR @Name = N''
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE IF EXISTS (
            SELECT 1
            FROM dbo.DRHeadMaster dest
            WHERE dest.UnderOrgID = @DestinationUnderOrgID
              AND dest.DRHeadName = @Name
        )
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE
        BEGIN
            SELECT @NextSrNo = ISNULL(MAX(dh.SrNo), 0) + 1
            FROM dbo.DRHeadMaster dh WITH (UPDLOCK, HOLDLOCK)
            WHERE dh.UnderOrgID = @DestinationUnderOrgID;

            INSERT INTO dbo.DRHeadMaster (UnderOrgID, SrNo, DRHeadName, IsActive)
            VALUES (@DestinationUnderOrgID, @NextSrNo, @Name, @IsActive);

            SET @ImportedCount = @ImportedCount + 1;
        END

        FETCH NEXT FROM src INTO @SourceID, @Name, @IsActive;
    END

    CLOSE src;
    DEALLOCATE src;

    COMMIT TRANSACTION;

    SELECT
        @ImportedCount AS ImportedCount,
        @SkippedCount AS SkippedCount;
END
GO

PRINT '072_DRHeadMaster_Import applied.';
GO
