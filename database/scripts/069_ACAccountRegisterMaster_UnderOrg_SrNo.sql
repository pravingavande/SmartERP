-- ============================================================
-- ACAccountRegisterMaster: ensure UnderOrgID + SrNo
-- SrNo auto-generates per UnderOrgID; user-editable; unique per UnderOrg
-- ============================================================
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.ACAccountRegisterMaster', 'UnderOrgID') IS NULL
BEGIN
    ALTER TABLE dbo.ACAccountRegisterMaster ADD UnderOrgID BIGINT NULL;
    PRINT 'Added ACAccountRegisterMaster.UnderOrgID';
END
GO

IF COL_LENGTH('dbo.ACAccountRegisterMaster', 'SrNo') IS NULL
BEGIN
    ALTER TABLE dbo.ACAccountRegisterMaster ADD SrNo BIGINT NULL;
    PRINT 'Added ACAccountRegisterMaster.SrNo';
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetAccountRegisterMaster
    @UnderOrgID BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        arm.AccountRegisterID,
        arm.UnderOrgID,
        arm.SrNo,
        arm.AccountRegister,
        arm.IsActive
    FROM dbo.ACAccountRegisterMaster arm
    WHERE ISNULL(arm.IsActive, 1) = 1
      AND (@UnderOrgID IS NULL OR arm.UnderOrgID = @UnderOrgID)
    ORDER BY arm.SrNo, arm.AccountRegister, arm.AccountRegisterID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegister_GetList
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        arm.AccountRegisterID,
        arm.UnderOrgID,
        arm.SrNo,
        arm.AccountRegister,
        arm.IsActive,
        om.OrganizationName
    FROM dbo.ACAccountRegisterMaster arm
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = arm.UnderOrgID
    WHERE arm.UnderOrgID = @UnderOrgID
    ORDER BY arm.SrNo, arm.AccountRegister, arm.AccountRegisterID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegister_GetById
    @AccountRegisterID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        arm.AccountRegisterID,
        arm.UnderOrgID,
        arm.SrNo,
        arm.AccountRegister,
        arm.IsActive,
        om.OrganizationName
    FROM dbo.ACAccountRegisterMaster arm
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = arm.UnderOrgID
    WHERE arm.AccountRegisterID = @AccountRegisterID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegister_GetNextSrNo
    @UnderOrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(arm.SrNo), 0) + 1 AS NextSrNo
    FROM dbo.ACAccountRegisterMaster arm
    WHERE arm.UnderOrgID = @UnderOrgID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegister_Save
    @AccountRegisterID BIGINT = NULL OUTPUT,
    @UnderOrgID BIGINT,
    @SrNo BIGINT = NULL,
    @AccountRegister NVARCHAR(200),
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @AccountRegister = LTRIM(RTRIM(ISNULL(@AccountRegister, N'')));

    IF @UnderOrgID IS NULL OR @UnderOrgID <= 0
    BEGIN
        RAISERROR('Organization is required.', 16, 1);
        RETURN;
    END

    IF @AccountRegister = N''
    BEGIN
        RAISERROR('Account register is required.', 16, 1);
        RETURN;
    END

    IF @SrNo IS NULL OR @SrNo <= 0
    BEGIN
        SELECT @SrNo = ISNULL(MAX(arm.SrNo), 0) + 1
        FROM dbo.ACAccountRegisterMaster arm WITH (UPDLOCK, HOLDLOCK)
        WHERE arm.UnderOrgID = @UnderOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.ACAccountRegisterMaster arm
        WHERE arm.UnderOrgID = @UnderOrgID
          AND arm.SrNo = @SrNo
          AND arm.AccountRegisterID <> ISNULL(@AccountRegisterID, 0)
    )
    BEGIN
        RAISERROR('Sr No already exists for this organization.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.ACAccountRegisterMaster arm
        WHERE arm.UnderOrgID = @UnderOrgID
          AND arm.AccountRegister = @AccountRegister
          AND arm.AccountRegisterID <> ISNULL(@AccountRegisterID, 0)
    )
    BEGIN
        RAISERROR('Account register already exists for this organization.', 16, 1);
        RETURN;
    END

    IF @AccountRegisterID IS NULL OR @AccountRegisterID = 0
    BEGIN
        INSERT INTO dbo.ACAccountRegisterMaster (UnderOrgID, SrNo, AccountRegister, IsActive)
        VALUES (@UnderOrgID, @SrNo, @AccountRegister, @IsActive);

        SET @AccountRegisterID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.ACAccountRegisterMaster
        SET UnderOrgID = @UnderOrgID,
            SrNo = @SrNo,
            AccountRegister = @AccountRegister,
            IsActive = @IsActive
        WHERE AccountRegisterID = @AccountRegisterID;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegister_Delete
    @AccountRegisterID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.ACAccountRegisterMaster
    SET IsActive = 0
    WHERE AccountRegisterID = @AccountRegisterID;
END
GO

PRINT '069_ACAccountRegisterMaster_UnderOrg_SrNo applied.';
GO
