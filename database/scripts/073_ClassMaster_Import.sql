-- ============================================================
-- ClassMaster Import
-- Copy selected rows from OrgID = 1 to destination org
-- Skip when ClassName already exists at destination
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_Import
    @DestinationOrgID BIGINT,
    @ClassIdsJson NVARCHAR(MAX),
    @ImportedCount INT = 0 OUTPUT,
    @SkippedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @ImportedCount = 0;
    SET @SkippedCount = 0;

    IF @DestinationOrgID IS NULL OR @DestinationOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @DestinationOrgID = 1
    BEGIN
        RAISERROR('Cannot import into the source organization.', 16, 1);
        RETURN;
    END

    IF @ClassIdsJson IS NULL OR LTRIM(RTRIM(@ClassIdsJson)) = N''
       OR LTRIM(RTRIM(@ClassIdsJson)) = N'[]'
    BEGIN
        RAISERROR('Select at least one class to import.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @SourceID BIGINT;
    DECLARE @Name NVARCHAR(200);
    DECLARE @IsActive BIT;
    DECLARE @NextSrNo BIGINT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT
        c.ClassID,
        LTRIM(RTRIM(c.ClassName)),
        ISNULL(c.IsActive, 1)
    FROM OPENJSON(@ClassIdsJson) d
    INNER JOIN dbo.ClassMaster c
        ON c.ClassID = TRY_CAST(d.value AS BIGINT)
    WHERE c.OrgID = 1
      AND ISNULL(c.IsActive, 1) = 1
      AND TRY_CAST(d.value AS BIGINT) IS NOT NULL
    ORDER BY c.SrNo, c.ClassID;

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
            FROM dbo.ClassMaster dest
            WHERE dest.OrgID = @DestinationOrgID
              AND dest.ClassName = @Name
        )
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE
        BEGIN
            SELECT @NextSrNo = ISNULL(MAX(c.SrNo), 0) + 1
            FROM dbo.ClassMaster c WITH (UPDLOCK, HOLDLOCK)
            WHERE c.OrgID = @DestinationOrgID;

            INSERT INTO dbo.ClassMaster (OrgID, SrNo, ClassName, IsActive)
            VALUES (@DestinationOrgID, @NextSrNo, @Name, @IsActive);

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

PRINT '073_ClassMaster_Import applied.';
GO
