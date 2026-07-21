-- ============================================================
-- LeaveTypeMaster: UnderOrgID + SrNo, org-filtered list,
-- delete, import (source org = 1)
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lt.LeaveTypeID,
        lt.UnderOrgID,
        lt.SrNo,
        lt.LeaveTypeName,
        lt.IsActive,
        om.OrganizationName
    FROM dbo.LeaveTypeMaster lt
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = lt.UnderOrgID
    WHERE lt.UnderOrgID = @OrgID
      AND (
          @Search IS NULL
          OR @Search = N''
          OR lt.LeaveTypeName LIKE N'%' + @Search + N'%'
      )
    ORDER BY lt.SrNo, lt.LeaveTypeName, lt.LeaveTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_GetById
    @LeaveTypeID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lt.LeaveTypeID,
        lt.UnderOrgID,
        lt.SrNo,
        lt.LeaveTypeName,
        lt.IsActive,
        om.OrganizationName
    FROM dbo.LeaveTypeMaster lt
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = lt.UnderOrgID
    WHERE lt.LeaveTypeID = @LeaveTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_GetNextSrNo
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(lt.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.LeaveTypeMaster lt
    WHERE lt.UnderOrgID = @OrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_Save
    @LeaveTypeID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @SrNo INT = NULL,
    @LeaveTypeName NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @LeaveTypeName = LTRIM(RTRIM(ISNULL(@LeaveTypeName, N'')));

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @LeaveTypeName = N''
    BEGIN
        RAISERROR('Leave type name is required.', 16, 1);
        RETURN;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(lt.SrNo), 0) + 1
        FROM dbo.LeaveTypeMaster lt WITH (UPDLOCK, HOLDLOCK)
        WHERE lt.UnderOrgID = @UnderOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.LeaveTypeMaster lt
        WHERE lt.UnderOrgID = @UnderOrgID
          AND lt.SrNo = @SrNo
          AND lt.LeaveTypeID <> ISNULL(@LeaveTypeID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.LeaveTypeMaster lt
        WHERE lt.UnderOrgID = @UnderOrgID
          AND lt.LeaveTypeName = @LeaveTypeName
          AND lt.LeaveTypeID <> ISNULL(@LeaveTypeID, 0)
    )
    BEGIN
        RAISERROR('Leave type name already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @LeaveTypeID IS NULL OR @LeaveTypeID = 0
    BEGIN
        INSERT INTO dbo.LeaveTypeMaster (UnderOrgID, SrNo, LeaveTypeName, IsActive)
        VALUES (@UnderOrgID, @SrNo, @LeaveTypeName, @IsActive);

        SET @LeaveTypeID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.LeaveTypeMaster
        SET UnderOrgID = @UnderOrgID,
            SrNo = @SrNo,
            LeaveTypeName = @LeaveTypeName,
            IsActive = @IsActive
        WHERE LeaveTypeID = @LeaveTypeID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_Delete
    @LeaveTypeID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.LeaveTypeMaster
    SET IsActive = 0
    WHERE LeaveTypeID = @LeaveTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LeaveType_Import
    @DestinationOrgID BIGINT,
    @LeaveTypeIdsJson NVARCHAR(MAX),
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

    IF @LeaveTypeIdsJson IS NULL OR LTRIM(RTRIM(@LeaveTypeIdsJson)) = N''
       OR LTRIM(RTRIM(@LeaveTypeIdsJson)) = N'[]'
    BEGIN
        RAISERROR('Select at least one leave type to import.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @SourceID BIGINT;
    DECLARE @Name NVARCHAR(200);
    DECLARE @IsActive BIT;
    DECLARE @NextSrNo INT;

    DECLARE src CURSOR LOCAL FAST_FORWARD FOR
    SELECT
        lt.LeaveTypeID,
        LTRIM(RTRIM(lt.LeaveTypeName)),
        ISNULL(lt.IsActive, 1)
    FROM OPENJSON(@LeaveTypeIdsJson) d
    INNER JOIN dbo.LeaveTypeMaster lt
        ON lt.LeaveTypeID = TRY_CAST(d.value AS BIGINT)
    WHERE lt.UnderOrgID = 1
      AND ISNULL(lt.IsActive, 1) = 1
      AND TRY_CAST(d.value AS BIGINT) IS NOT NULL
    ORDER BY lt.SrNo, lt.LeaveTypeID;

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
            FROM dbo.LeaveTypeMaster dest
            WHERE dest.UnderOrgID = @DestinationOrgID
              AND dest.LeaveTypeName = @Name
        )
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END
        ELSE
        BEGIN
            SELECT @NextSrNo = ISNULL(MAX(lt.SrNo), 0) + 1
            FROM dbo.LeaveTypeMaster lt WITH (UPDLOCK, HOLDLOCK)
            WHERE lt.UnderOrgID = @DestinationOrgID;

            INSERT INTO dbo.LeaveTypeMaster (UnderOrgID, SrNo, LeaveTypeName, IsActive)
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

PRINT '081_LeaveType_UnderOrgID_SrNo applied.';
GO
