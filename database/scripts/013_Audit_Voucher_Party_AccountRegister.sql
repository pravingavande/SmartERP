-- Audit voucher enhancements: BankName, Party Master CRUD, Account Register Define
-- Rules: no SELECT *, no MERGE, no BETWEEN

USE SmartERP;
GO

IF COL_LENGTH('dbo.ACVoucher', 'BankName') IS NULL
    ALTER TABLE dbo.ACVoucher ADD BankName NVARCHAR(200) NULL;
GO

IF COL_LENGTH('dbo.PartyMaster', 'RecordNo') IS NULL
    ALTER TABLE dbo.PartyMaster ADD RecordNo BIGINT NULL;
GO

IF COL_LENGTH('dbo.PartyMaster', 'Address') IS NULL
    ALTER TABLE dbo.PartyMaster ADD Address NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.PartyMaster', 'PanNo') IS NULL
    ALTER TABLE dbo.PartyMaster ADD PanNo NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.PartyMaster', 'GSTNo') IS NULL
    ALTER TABLE dbo.PartyMaster ADD GSTNo NVARCHAR(20) NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Voucher_GetById
    @VoucherID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        v.VoucherID,
        v.OrgID,
        v.AccountRegisterID,
        v.VType,
        v.VCode,
        v.VDate,
        v.PartyTID,
        v.TotalAmount,
        v.Remark,
        v.PaymentTypeID,
        v.TransactionNo,
        v.TransactionDate,
        v.DepositDate,
        v.LedgerHeadBankID,
        v.BankName,
        v.FilePath,
        v.UserID,
        v.FyID,
        om.OrganizationName,
        arm.AccountRegister,
        pm.PartyName,
        pt.PaymentType,
        fy.FyName
    FROM dbo.ACVoucher v
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = v.OrgID
    LEFT JOIN dbo.ACAccountRegisterMaster arm ON arm.AccountRegisterID = v.AccountRegisterID
    LEFT JOIN dbo.PartyMaster pm ON pm.PartyID = v.PartyTID
    LEFT JOIN dbo.PaymentTypeMaster pt ON pt.PaymentTypeID = v.PaymentTypeID
    LEFT JOIN dbo.FyMaster fy ON fy.FyID = v.FyID
    WHERE v.VoucherID = @VoucherID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Voucher_Save
    @VoucherID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @AccountRegisterID BIGINT,
    @VType NVARCHAR(10),
    @VCode BIGINT,
    @VDate DATETIME,
    @PartyTID BIGINT = NULL,
    @Remark NVARCHAR(MAX) = NULL,
    @PaymentTypeID BIGINT = NULL,
    @TransactionNo NVARCHAR(100) = NULL,
    @TransactionDate DATE = NULL,
    @DepositDate DATETIME = NULL,
    @LedgerHeadBankID BIGINT = NULL,
    @BankName NVARCHAR(200) = NULL,
    @FilePath NVARCHAR(510) = NULL,
    @UserID BIGINT,
    @FyID BIGINT,
    @DetailsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @TotalAmount NUMERIC(18, 2);
    DECLARE @DetailCount INT;
    DECLARE @FyFromDate DATE;
    DECLARE @FyToDate DATE;

    SELECT
        @FyFromDate = fy.FromDate,
        @FyToDate = fy.ToDate
    FROM dbo.FyMaster fy
    WHERE fy.FyID = @FyID;

    IF @FyFromDate IS NULL
    BEGIN
        RAISERROR('Invalid financial year.', 16, 1);
        RETURN;
    END

    IF CAST(@VDate AS DATE) < @FyFromDate OR CAST(@VDate AS DATE) > @FyToDate
    BEGIN
        RAISERROR('Voucher date must be within the selected financial year.', 16, 1);
        RETURN;
    END

    SELECT @DetailCount = COUNT(1)
    FROM OPENJSON(@DetailsJson) d;

    IF @DetailCount < 1
    BEGIN
        RAISERROR('At least one voucher detail line is required.', 16, 1);
        RETURN;
    END

    SELECT @TotalAmount = ISNULL(SUM(CAST(JSON_VALUE(d.value, '$.amount') AS NUMERIC(18, 2))), 0)
    FROM OPENJSON(@DetailsJson) d;

    IF @TotalAmount <= 0
    BEGIN
        RAISERROR('Total amount must be greater than zero.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    IF @VoucherID IS NULL OR @VoucherID = 0
    BEGIN
        SELECT @VCode = ISNULL(MAX(v.VCode), 0) + 1
        FROM dbo.ACVoucher v WITH (UPDLOCK, HOLDLOCK)
        WHERE v.OrgID = @OrgID
          AND v.AccountRegisterID = @AccountRegisterID
          AND v.FyID = @FyID
          AND (
              v.VType = @VType
              OR (@VType = N'R' AND v.VType = N'RV')
              OR (@VType = N'P' AND v.VType = N'PV')
          );

        INSERT INTO dbo.ACVoucher (
            OrgID, AccountRegisterID, VType, VCode, VDate, PartyTID, TotalAmount, Remark,
            PaymentTypeID, TransactionNo, TransactionDate, DepositDate, LedgerHeadBankID,
            BankName, FilePath, UserID, FyID
        )
        VALUES (
            @OrgID, @AccountRegisterID, @VType, @VCode, @VDate, @PartyTID, @TotalAmount, @Remark,
            @PaymentTypeID, @TransactionNo, @TransactionDate, @DepositDate, @LedgerHeadBankID,
            @BankName, @FilePath, @UserID, @FyID
        );

        SET @VoucherID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.ACVoucher
        SET OrgID = @OrgID,
            AccountRegisterID = @AccountRegisterID,
            VType = @VType,
            VCode = @VCode,
            VDate = @VDate,
            PartyTID = @PartyTID,
            TotalAmount = @TotalAmount,
            Remark = @Remark,
            PaymentTypeID = @PaymentTypeID,
            TransactionNo = @TransactionNo,
            TransactionDate = @TransactionDate,
            DepositDate = @DepositDate,
            LedgerHeadBankID = @LedgerHeadBankID,
            BankName = @BankName,
            FilePath = @FilePath,
            UserID = @UserID,
            FyID = @FyID
        WHERE VoucherID = @VoucherID;

        DELETE FROM dbo.ACVoucherDetail
        WHERE VoucherID = @VoucherID;
    END

    INSERT INTO dbo.ACVoucherDetail (VoucherID, SrNo, LedgerHeadID, LedgerHeadNarration, Amount)
    SELECT
        @VoucherID,
        CAST(JSON_VALUE(d.value, '$.srNo') AS BIGINT),
        CAST(JSON_VALUE(d.value, '$.ledgerHeadId') AS BIGINT),
        JSON_VALUE(d.value, '$.ledgerHeadNarration'),
        CAST(JSON_VALUE(d.value, '$.amount') AS NUMERIC(18, 2))
    FROM OPENJSON(@DetailsJson) d;

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetAccountRegisterMaster
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        arm.AccountRegisterID,
        arm.AccountRegister
    FROM dbo.ACAccountRegisterMaster arm
    WHERE arm.IsActive = 1
    ORDER BY arm.AccountRegister;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetAccountRegisters
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LookupOrgID BIGINT = @OrgID;

    WHILE @LookupOrgID IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM dbo.ACAccountRegisterOrgWiseDefine ard
            WHERE ard.UnderOrgID = @LookupOrgID
        )
            BREAK;

        SELECT @LookupOrgID = parent.UnderOrgID
        FROM dbo.OrgMaster child
        INNER JOIN dbo.OrgMaster parent ON parent.OrgID = child.UnderOrgID
        WHERE child.OrgID = @LookupOrgID
          AND child.OrgID <> ISNULL(child.UnderOrgID, 0)
          AND ISNULL(parent.IsActive, 1) = 1;

        IF @@ROWCOUNT = 0
            SET @LookupOrgID = NULL;
    END

    SELECT
        arm.AccountRegisterID,
        arm.AccountRegister,
        @OrgID AS OrgID
    FROM dbo.ACAccountRegisterOrgWiseDefine ard
    INNER JOIN dbo.ACAccountRegisterMaster arm ON arm.AccountRegisterID = ard.AccountRegisterID
    WHERE ard.UnderOrgID = @LookupOrgID
      AND arm.IsActive = 1
    ORDER BY arm.AccountRegister;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegisterDefine_GetByOrg
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ard.AccountRegisterID,
        arm.AccountRegister
    FROM dbo.ACAccountRegisterOrgWiseDefine ard
    INNER JOIN dbo.ACAccountRegisterMaster arm ON arm.AccountRegisterID = ard.AccountRegisterID
    WHERE ard.UnderOrgID = @OrgID
      AND arm.IsActive = 1
    ORDER BY arm.AccountRegister;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_AccountRegisterDefine_Save
    @OrgID BIGINT,
    @AccountRegisterIdsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DELETE FROM dbo.ACAccountRegisterOrgWiseDefine
    WHERE UnderOrgID = @OrgID;

    INSERT INTO dbo.ACAccountRegisterOrgWiseDefine (UnderOrgID, AccountRegisterID)
    SELECT
        @OrgID,
        CAST(d.value AS BIGINT)
    FROM OPENJSON(@AccountRegisterIdsJson) d
    WHERE TRY_CAST(d.value AS BIGINT) IS NOT NULL;

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Party_GetList
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pm.PartyID,
        pm.OrgID,
        pm.RecordNo,
        pm.PartyName,
        pm.Address,
        pm.MobNo,
        pm.PanNo,
        pm.GSTNo,
        pm.IsActive
    FROM dbo.PartyMaster pm
    WHERE pm.OrgID = @OrgID
    ORDER BY pm.RecordNo, pm.PartyName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Party_GetById
    @PartyID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pm.PartyID,
        pm.OrgID,
        pm.RecordNo,
        pm.PartyName,
        pm.Address,
        pm.MobNo,
        pm.PanNo,
        pm.GSTNo,
        pm.IsActive
    FROM dbo.PartyMaster pm
    WHERE pm.PartyID = @PartyID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Party_Save
    @PartyID BIGINT = NULL OUTPUT,
    @OrgID BIGINT,
    @PartyName NVARCHAR(200),
    @Address NVARCHAR(500) = NULL,
    @MobNo NVARCHAR(20) = NULL,
    @PanNo NVARCHAR(20) = NULL,
    @GSTNo NVARCHAR(20) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @PartyID IS NULL OR @PartyID = 0
    BEGIN
        DECLARE @RecordNo BIGINT;

        SELECT @RecordNo = ISNULL(MAX(pm.RecordNo), 0) + 1
        FROM dbo.PartyMaster pm
        WHERE pm.OrgID = @OrgID;

        INSERT INTO dbo.PartyMaster (
            OrgID, RecordNo, PartyName, Address, MobNo, PanNo, GSTNo, IsActive
        )
        VALUES (
            @OrgID, @RecordNo, @PartyName, @Address, @MobNo, @PanNo, @GSTNo, @IsActive
        );

        SET @PartyID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.PartyMaster
        SET PartyName = @PartyName,
            Address = @Address,
            MobNo = @MobNo,
            PanNo = @PanNo,
            GSTNo = @GSTNo,
            IsActive = @IsActive
        WHERE PartyID = @PartyID;
    END
END
GO
