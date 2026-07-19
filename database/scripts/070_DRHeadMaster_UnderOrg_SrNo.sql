-- ============================================================
-- DRHeadMaster: ensure UnderOrgID + SrNo
-- SrNo auto-generates per UnderOrgID; user-editable; unique per org
-- ============================================================
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.DRHeadMaster', 'UnderOrgID') IS NULL
BEGIN
    ALTER TABLE dbo.DRHeadMaster ADD UnderOrgID BIGINT NULL;
    PRINT 'Added DRHeadMaster.UnderOrgID';
END
GO

IF COL_LENGTH('dbo.DRHeadMaster', 'SrNo') IS NULL
BEGIN
    ALTER TABLE dbo.DRHeadMaster ADD SrNo BIGINT NULL;
    PRINT 'Added DRHeadMaster.SrNo';
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetDRHeadMaster
    @UnderOrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dh.DRHeadID,
        dh.UnderOrgID,
        dh.SrNo,
        dh.DRHeadName,
        dh.IsActive
    FROM dbo.DRHeadMaster dh
    WHERE ISNULL(dh.IsActive, 1) = 1
      AND (@UnderOrgID IS NULL OR dh.UnderOrgID = @UnderOrgID)
    ORDER BY dh.SrNo, dh.DRHeadName, dh.DRHeadID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHead_GetList
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dh.DRHeadID,
        dh.UnderOrgID,
        dh.SrNo,
        dh.DRHeadName,
        dh.IsActive,
        om.OrganizationName
    FROM dbo.DRHeadMaster dh
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dh.UnderOrgID
    WHERE dh.UnderOrgID = @UnderOrgID
    ORDER BY dh.SrNo, dh.DRHeadName, dh.DRHeadID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHead_GetById
    @DRHeadID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dh.DRHeadID,
        dh.UnderOrgID,
        dh.SrNo,
        dh.DRHeadName,
        dh.IsActive,
        om.OrganizationName
    FROM dbo.DRHeadMaster dh
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dh.UnderOrgID
    WHERE dh.DRHeadID = @DRHeadID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHead_GetNextSrNo
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(dh.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.DRHeadMaster dh
    WHERE dh.UnderOrgID = @UnderOrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHead_Save
    @DRHeadID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @SrNo BIGINT = NULL,
    @DRHeadName NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @DRHeadName = LTRIM(RTRIM(ISNULL(@DRHeadName, N'')));

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @DRHeadName = N''
    BEGIN
        RAISERROR('Donation head is required.', 16, 1);
        RETURN;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(dh.SrNo), 0) + 1
        FROM dbo.DRHeadMaster dh WITH (UPDLOCK, HOLDLOCK)
        WHERE dh.UnderOrgID = @UnderOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.DRHeadMaster dh
        WHERE dh.UnderOrgID = @UnderOrgID
          AND dh.SrNo = @SrNo
          AND dh.DRHeadID <> ISNULL(@DRHeadID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.DRHeadMaster dh
        WHERE dh.UnderOrgID = @UnderOrgID
          AND dh.DRHeadName = @DRHeadName
          AND dh.DRHeadID <> ISNULL(@DRHeadID, 0)
    )
    BEGIN
        RAISERROR('Donation head already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @DRHeadID IS NULL OR @DRHeadID = 0
    BEGIN
        INSERT INTO dbo.DRHeadMaster (UnderOrgID, SrNo, DRHeadName, IsActive)
        VALUES (@UnderOrgID, @SrNo, @DRHeadName, @IsActive);

        SET @DRHeadID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.DRHeadMaster
        SET UnderOrgID = @UnderOrgID,
            SrNo = @SrNo,
            DRHeadName = @DRHeadName,
            IsActive = @IsActive
        WHERE DRHeadID = @DRHeadID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_DRHead_Delete
    @DRHeadID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.DRHeadMaster
    SET IsActive = 0
    WHERE DRHeadID = @DRHeadID;
END
GO

PRINT '070_DRHeadMaster_UnderOrg_SrNo applied.';
GO
