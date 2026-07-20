-- ============================================================
-- Ledger Head Master: store OrgID on Add / Edit / Import
-- (same selected org as form UnderOrgID)
-- ============================================================
SET NOCOUNT ON;
GO

-- Backfill any rows saved without OrgID
UPDATE dbo.ACLedgerHeadMaster
SET OrgID = UnderOrgID
WHERE OrgID IS NULL
  AND UnderOrgID IS NOT NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_LedgerHead_GetList
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lh.LedgerHeadID,
        lh.UnderOrgID,
        lh.OrgID,
        lh.SrNo,
        lh.LedgerHead,
        lh.LedgerHeadEng,
        lh.Description,
        lh.LedgerTypeID,
        lh.IsActive,
        lt.LedgerType
    FROM dbo.ACLedgerHeadMaster lh
    LEFT JOIN dbo.ACLedgerTypeMaster lt ON lt.LedgerTypeID = lh.LedgerTypeID
    WHERE lh.UnderOrgID = @UnderOrgID
    ORDER BY lh.SrNo, lh.LedgerHeadID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_LedgerHead_GetById
    @LedgerHeadID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lh.LedgerHeadID,
        lh.UnderOrgID,
        lh.OrgID,
        lh.SrNo,
        lh.LedgerHead,
        lh.LedgerHeadEng,
        lh.Description,
        lh.LedgerTypeID,
        lh.IsActive,
        lt.LedgerType
    FROM dbo.ACLedgerHeadMaster lh
    LEFT JOIN dbo.ACLedgerTypeMaster lt ON lt.LedgerTypeID = lh.LedgerTypeID
    WHERE lh.LedgerHeadID = @LedgerHeadID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_LedgerHead_Save
    @LedgerHeadID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @OrgID BIGINT = NULL,
    @LedgerHead NVARCHAR(200),
    @LedgerHeadEng NVARCHAR(100) = NULL,
    @Description NVARCHAR(MAX) = NULL,
    @LedgerTypeID BIGINT,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ResolvedOrgID BIGINT = COALESCE(NULLIF(@OrgID, 0), @UnderOrgID);

    IF @LedgerHeadID IS NULL OR @LedgerHeadID = 0
    BEGIN
        DECLARE @SrNo BIGINT;

        SELECT @SrNo = ISNULL(MAX(lh.SrNo), 0) + 1
        FROM dbo.ACLedgerHeadMaster lh
        WHERE lh.UnderOrgID = @UnderOrgID;

        INSERT INTO dbo.ACLedgerHeadMaster (
            UnderOrgID,
            OrgID,
            SrNo,
            LedgerHead,
            LedgerHeadEng,
            Description,
            LedgerTypeID,
            IsActive
        )
        VALUES (
            @UnderOrgID,
            @ResolvedOrgID,
            @SrNo,
            @LedgerHead,
            @LedgerHeadEng,
            @Description,
            @LedgerTypeID,
            @IsActive
        );

        SET @LedgerHeadID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.ACLedgerHeadMaster
        SET UnderOrgID = @UnderOrgID,
            OrgID = @ResolvedOrgID,
            LedgerHead = @LedgerHead,
            LedgerHeadEng = @LedgerHeadEng,
            Description = @Description,
            LedgerTypeID = @LedgerTypeID,
            IsActive = @IsActive
        WHERE LedgerHeadID = @LedgerHeadID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_LedgerHead_Import
    @DestinationUnderOrgID BIGINT,
    @DestinationOrgID BIGINT = NULL,
    @LedgerHeadIdsJson NVARCHAR(MAX),
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

    IF @LedgerHeadIdsJson IS NULL OR LTRIM(RTRIM(@LedgerHeadIdsJson)) = N''
       OR LTRIM(RTRIM(@LedgerHeadIdsJson)) = N'[]'
    BEGIN
        RAISERROR('Select at least one ledger head to import.', 16, 1);
        RETURN;
    END

    DECLARE @ResolvedOrgID BIGINT = COALESCE(NULLIF(@DestinationOrgID, 0), @DestinationUnderOrgID);

    BEGIN TRANSACTION;

    DECLARE @SourceID BIGINT;
    DECLARE @Name NVARCHAR(200);
    DECLARE @Eng NVARCHAR(100);
    DECLARE @Description NVARCHAR(MAX);
    DECLARE @LedgerTypeID BIGINT;
    DECLARE @IsActive BIT;
    DECLARE @NextSrNo BIGINT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT
        lh.LedgerHeadID,
        LTRIM(RTRIM(lh.LedgerHead)),
        lh.LedgerHeadEng,
        lh.Description,
        lh.LedgerTypeID,
        ISNULL(lh.IsActive, 1)
    FROM OPENJSON(@LedgerHeadIdsJson) d
    INNER JOIN dbo.ACLedgerHeadMaster lh
        ON lh.LedgerHeadID = TRY_CAST(d.value AS BIGINT)
    WHERE lh.UnderOrgID = 1
      AND ISNULL(lh.IsActive, 1) = 1
      AND TRY_CAST(d.value AS BIGINT) IS NOT NULL
    ORDER BY lh.SrNo, lh.LedgerHeadID;

    OPEN src;
    FETCH NEXT FROM src INTO @SourceID, @Name, @Eng, @Description, @LedgerTypeID, @IsActive;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Name IS NULL OR @Name = N'' OR @LedgerTypeID IS NULL OR @LedgerTypeID <= 0
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE IF EXISTS (
            SELECT 1
            FROM dbo.ACLedgerHeadMaster dest
            WHERE dest.UnderOrgID = @DestinationUnderOrgID
              AND dest.LedgerHead = @Name
        )
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE
        BEGIN
            SELECT @NextSrNo = ISNULL(MAX(lh.SrNo), 0) + 1
            FROM dbo.ACLedgerHeadMaster lh WITH (UPDLOCK, HOLDLOCK)
            WHERE lh.UnderOrgID = @DestinationUnderOrgID;

            INSERT INTO dbo.ACLedgerHeadMaster (
                UnderOrgID,
                OrgID,
                SrNo,
                LedgerHead,
                LedgerHeadEng,
                Description,
                LedgerTypeID,
                IsActive
            )
            VALUES (
                @DestinationUnderOrgID,
                @ResolvedOrgID,
                @NextSrNo,
                @Name,
                @Eng,
                @Description,
                @LedgerTypeID,
                @IsActive
            );

            SET @ImportedCount = @ImportedCount + 1;
        END

        FETCH NEXT FROM src INTO @SourceID, @Name, @Eng, @Description, @LedgerTypeID, @IsActive;
    END

    CLOSE src;
    DEALLOCATE src;

    COMMIT TRANSACTION;

    SELECT
        @ImportedCount AS ImportedCount,
        @SkippedCount AS SkippedCount;
END
GO
