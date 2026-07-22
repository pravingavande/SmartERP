-- Designation Save/Import/Delete: match live schema (HMOrPrincipal nvarchar, IsActive bit, LeaveYear nvarchar)
-- No sql_variant, no table data changes
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_Save
    @DesignationID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @SrNo BIGINT = NULL,
    @DesignationName NVARCHAR(200),
    @DesignationNameShort NVARCHAR(50) = NULL,
    @LeaveYear INT = NULL,
    @HMOrPrincipal BIT = 0,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @HmWrite NVARCHAR(50) = CASE WHEN @HMOrPrincipal = 1 THEN N'Y' ELSE N'N' END;
    DECLARE @LeaveYearWrite NVARCHAR(100) = CASE WHEN @LeaveYear IS NULL THEN NULL ELSE CAST(@LeaveYear AS NVARCHAR(100)) END;

    SET @DesignationName = LTRIM(RTRIM(ISNULL(@DesignationName, N'')));
    SET @DesignationNameShort = NULLIF(LTRIM(RTRIM(ISNULL(@DesignationNameShort, N''))), N'');

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @DesignationName = N''
    BEGIN
        RAISERROR('Designation name is required.', 16, 1);
        RETURN;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(ISNULL(dm.SrNo, 0)), 0) + 1
        FROM dbo.DesignationMaster dm WITH (UPDLOCK, HOLDLOCK)
        WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.DesignationMaster dm
        WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
          AND ISNULL(dm.SrNo, 0) = @SrNo
          AND dm.DesignationID <> ISNULL(@DesignationID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.DesignationMaster dm
        WHERE ISNULL(dm.UnderOrgID, 1) = @UnderOrgID
          AND dm.DesignationName = @DesignationName
          AND dm.DesignationID <> ISNULL(@DesignationID, 0)
    )
    BEGIN
        RAISERROR('Designation name already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @DesignationID IS NULL OR @DesignationID = 0
    BEGIN
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
            @UnderOrgID,
            @SrNo,
            @DesignationName,
            @DesignationNameShort,
            @LeaveYearWrite,
            @HmWrite,
            @IsActive
        );

        SET @DesignationID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.DesignationMaster
        SET UnderOrgID = @UnderOrgID,
            SrNo = @SrNo,
            DesignationName = @DesignationName,
            DesignationNameShort = @DesignationNameShort,
            LeaveYear = @LeaveYearWrite,
            HMOrPrincipal = @HmWrite,
            IsActive = @IsActive
        WHERE DesignationID = @DesignationID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_Delete
    @DesignationID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.DesignationMaster
    SET IsActive = CAST(0 AS BIT)
    WHERE DesignationID = @DesignationID;
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
    DECLARE @Short NVARCHAR(100);
    DECLARE @LeaveYear NVARCHAR(100);
    DECLARE @HMOrPrincipal BIT;
    DECLARE @IsActive BIT;
    DECLARE @HmWrite NVARCHAR(50);
    DECLARE @NextSrNo BIGINT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT
        LTRIM(RTRIM(dm.DesignationName)),
        dm.DesignationNameShort,
        NULLIF(LTRIM(RTRIM(CAST(dm.LeaveYear AS NVARCHAR(100)))), N''),
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.HMOrPrincipal AS NVARCHAR(50))))) IN (N'Y', N'1', N'T', N'TRUE', N'H', N'P') THEN 1
            ELSE 0
        END AS BIT),
        CAST(CASE
            WHEN dm.IsActive IS NULL THEN 1
            WHEN dm.IsActive = 1 THEN 1
            ELSE 0
        END AS BIT)
    FROM OPENJSON(@DesignationIdsJson) d
    INNER JOIN dbo.DesignationMaster dm
        ON dm.DesignationID = TRY_CAST(d.value AS BIGINT)
    WHERE TRY_CAST(d.value AS BIGINT) IS NOT NULL
    ORDER BY ISNULL(dm.SrNo, 0), dm.DesignationID;

    OPEN src;
    FETCH NEXT FROM src INTO @Name, @Short, @LeaveYear, @HMOrPrincipal, @IsActive;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @HmWrite = CASE WHEN @HMOrPrincipal = 1 THEN N'Y' ELSE N'N' END;

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
            SELECT @NextSrNo = ISNULL(MAX(ISNULL(dm.SrNo, 0)), 0) + 1
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
                @HmWrite,
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

PRINT '106_Designation_Write_Schema_Fix applied.';
GO
