-- ============================================================
-- ACAccountRegisterMaster Import
-- Copy selected rows from UnderOrgID = 1 to destination org
-- Skip when AccountRegister name already exists at destination
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegister_Import
    @DestinationUnderOrgID BIGINT,
    @AccountRegisterIdsJson NVARCHAR(MAX),
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

    IF @AccountRegisterIdsJson IS NULL OR LTRIM(RTRIM(@AccountRegisterIdsJson)) = N''
       OR LTRIM(RTRIM(@AccountRegisterIdsJson)) = N'[]'
    BEGIN
        RAISERROR('Select at least one account register to import.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @SourceID BIGINT;
    DECLARE @Name NVARCHAR(200);
    DECLARE @IsActive BIT;
    DECLARE @NextSrNo BIGINT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT
        arm.AccountRegisterID,
        LTRIM(RTRIM(arm.AccountRegister)),
        ISNULL(arm.IsActive, 1)
    FROM OPENJSON(@AccountRegisterIdsJson) d
    INNER JOIN dbo.ACAccountRegisterMaster arm
        ON arm.AccountRegisterID = TRY_CAST(d.value AS BIGINT)
    WHERE arm.UnderOrgID = 1
      AND ISNULL(arm.IsActive, 1) = 1
      AND TRY_CAST(d.value AS BIGINT) IS NOT NULL
    ORDER BY arm.SrNo, arm.AccountRegisterID;

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
            FROM dbo.ACAccountRegisterMaster dest
            WHERE dest.UnderOrgID = @DestinationUnderOrgID
              AND dest.AccountRegister = @Name
        )
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE
        BEGIN
            SELECT @NextSrNo = ISNULL(MAX(arm.SrNo), 0) + 1
            FROM dbo.ACAccountRegisterMaster arm WITH (UPDLOCK, HOLDLOCK)
            WHERE arm.UnderOrgID = @DestinationUnderOrgID;

            INSERT INTO dbo.ACAccountRegisterMaster (UnderOrgID, SrNo, AccountRegister, IsActive)
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

PRINT '071_ACAccountRegister_Import applied.';
GO
