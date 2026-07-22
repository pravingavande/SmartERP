-- Fix designation Save/Import/Delete writes: HMOrPrincipal may be varchar, IsActive may be bit (no data changes)
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

    DECLARE @HmWrite SQL_VARIANT;
    DECLARE @ActiveWrite SQL_VARIANT;

    IF EXISTS (
        SELECT 1
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'dbo.DesignationMaster', N'U')
          AND c.name = N'HMOrPrincipal'
          AND t.name = N'bit'
    )
        SET @HmWrite = CAST(@HMOrPrincipal AS BIT);
    ELSE
        SET @HmWrite = CASE WHEN @HMOrPrincipal = 1 THEN CAST(N'Y' AS NVARCHAR(1)) ELSE CAST(N'N' AS NVARCHAR(1)) END;

    IF EXISTS (
        SELECT 1
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'dbo.DesignationMaster', N'U')
          AND c.name = N'IsActive'
          AND t.name = N'bit'
    )
        SET @ActiveWrite = CAST(@IsActive AS BIT);
    ELSE
        SET @ActiveWrite = CASE WHEN @IsActive = 1 THEN CAST(N'Y' AS NVARCHAR(1)) ELSE CAST(N'N' AS NVARCHAR(1)) END;

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
            @LeaveYear,
            @HmWrite,
            @ActiveWrite
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
            LeaveYear = @LeaveYear,
            HMOrPrincipal = @HmWrite,
            IsActive = @ActiveWrite
        WHERE DesignationID = @DesignationID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Designation_Delete
    @DesignationID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @InactiveWrite SQL_VARIANT;

    IF EXISTS (
        SELECT 1
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'dbo.DesignationMaster', N'U')
          AND c.name = N'IsActive'
          AND t.name = N'bit'
    )
        SET @InactiveWrite = CAST(0 AS BIT);
    ELSE
        SET @InactiveWrite = CAST(N'N' AS NVARCHAR(1));

    UPDATE dbo.DesignationMaster
    SET IsActive = @InactiveWrite
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

    DECLARE @HmIsBit BIT = CASE WHEN EXISTS (
        SELECT 1
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'dbo.DesignationMaster', N'U')
          AND c.name = N'HMOrPrincipal'
          AND t.name = N'bit'
    ) THEN 1 ELSE 0 END;

    DECLARE @ActiveIsBit BIT = CASE WHEN EXISTS (
        SELECT 1
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'dbo.DesignationMaster', N'U')
          AND c.name = N'IsActive'
          AND t.name = N'bit'
    ) THEN 1 ELSE 0 END;

    BEGIN TRANSACTION;

    DECLARE @Name NVARCHAR(200);
    DECLARE @Short NVARCHAR(50);
    DECLARE @LeaveYear INT;
    DECLARE @HMOrPrincipal BIT;
    DECLARE @IsActive BIT;
    DECLARE @HmWrite SQL_VARIANT;
    DECLARE @ActiveWrite SQL_VARIANT;
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
        CAST(CASE
            WHEN UPPER(LTRIM(RTRIM(CAST(dm.IsActive AS NVARCHAR(20))))) IN (N'Y', N'1', N'T', N'TRUE') THEN 1
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
        IF @HmIsBit = 1
            SET @HmWrite = CAST(@HMOrPrincipal AS BIT);
        ELSE
            SET @HmWrite = CASE WHEN @HMOrPrincipal = 1 THEN CAST(N'Y' AS NVARCHAR(1)) ELSE CAST(N'N' AS NVARCHAR(1)) END;

        IF @ActiveIsBit = 1
            SET @ActiveWrite = CAST(@IsActive AS BIT);
        ELSE
            SET @ActiveWrite = CASE WHEN @IsActive = 1 THEN CAST(N'Y' AS NVARCHAR(1)) ELSE CAST(N'N' AS NVARCHAR(1)) END;

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
                @ActiveWrite
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

PRINT '105_Designation_Write_Type_Fix applied.';
GO
