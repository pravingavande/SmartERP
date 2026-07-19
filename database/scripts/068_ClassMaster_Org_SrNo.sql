-- ============================================================
-- ClassMaster: remove ClassGroupCode; ensure OrgID + SrNo
-- SrNo auto-generates per OrgID; user-editable; unique per Org
-- ============================================================
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.ClassMaster', 'ClassGroupCode') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ClassMaster DROP COLUMN ClassGroupCode;
    PRINT 'Dropped ClassMaster.ClassGroupCode';
END
GO

IF COL_LENGTH('dbo.ClassMaster', 'OrgID') IS NULL
BEGIN
    ALTER TABLE dbo.ClassMaster ADD OrgID BIGINT NULL;
    PRINT 'Added ClassMaster.OrgID';
END
GO

IF COL_LENGTH('dbo.ClassMaster', 'SrNo') IS NULL
BEGIN
    ALTER TABLE dbo.ClassMaster ADD SrNo BIGINT NULL;
    PRINT 'Added ClassMaster.SrNo';
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_GetList
    @OrgID BIGINT,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.ClassID,
        c.OrgID,
        c.SrNo,
        c.ClassName,
        c.IsActive,
        om.OrganizationName
    FROM dbo.ClassMaster c
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = c.OrgID
    WHERE c.OrgID = @OrgID
      AND (
          @Search IS NULL
          OR @Search = N''
          OR c.ClassName LIKE N'%' + @Search + N'%'
      )
    ORDER BY c.SrNo, c.ClassName, c.ClassID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_GetById
    @ClassID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.ClassID,
        c.OrgID,
        c.SrNo,
        c.ClassName,
        c.IsActive,
        om.OrganizationName
    FROM dbo.ClassMaster c
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = c.OrgID
    WHERE c.ClassID = @ClassID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_GetOptions
    @OrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.ClassID,
        c.ClassName
    FROM dbo.ClassMaster c
    WHERE ISNULL(c.IsActive, 1) = 1
      AND (@OrgID IS NULL OR c.OrgID = @OrgID)
    ORDER BY c.SrNo, c.ClassName, c.ClassID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_GetNextSrNo
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(c.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.ClassMaster c
    WHERE c.OrgID = @OrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_Save
    @ClassID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @SrNo BIGINT = NULL,
    @ClassName NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @ClassName = LTRIM(RTRIM(ISNULL(@ClassName, N'')));

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @ClassName = N''
    BEGIN
        RAISERROR('Class name is required.', 16, 1);
        RETURN;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(c.SrNo), 0) + 1
        FROM dbo.ClassMaster c WITH (UPDLOCK, HOLDLOCK)
        WHERE c.OrgID = @OrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.ClassMaster c
        WHERE c.OrgID = @OrgID
          AND c.SrNo = @SrNo
          AND c.ClassID <> ISNULL(@ClassID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.ClassMaster c
        WHERE c.OrgID = @OrgID
          AND c.ClassName = @ClassName
          AND c.ClassID <> ISNULL(@ClassID, 0)
    )
    BEGIN
        RAISERROR('Class name already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @ClassID IS NULL OR @ClassID = 0
    BEGIN
        INSERT INTO dbo.ClassMaster (OrgID, SrNo, ClassName, IsActive)
        VALUES (@OrgID, @SrNo, @ClassName, @IsActive);

        SET @ClassID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.ClassMaster
        SET OrgID = @OrgID,
            SrNo = @SrNo,
            ClassName = @ClassName,
            IsActive = @IsActive
        WHERE ClassID = @ClassID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Class_Delete
    @ClassID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.ClassMaster
    SET IsActive = 0
    WHERE ClassID = @ClassID;
END
GO

PRINT '068_ClassMaster_Org_SrNo applied.';
GO
