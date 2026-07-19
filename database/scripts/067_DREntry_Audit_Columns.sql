-- ============================================================
-- DREntry audit fields only
-- Add: CreatedDate, ModifiedDate, CreatedUserID, ModifiedUserID
-- Insert → Created*; Update → Modified*
-- ============================================================
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.DREntry', 'CreatedDate') IS NULL
BEGIN
    ALTER TABLE dbo.DREntry ADD CreatedDate DATETIME NULL;
    PRINT 'Added DREntry.CreatedDate';
END
GO

IF COL_LENGTH('dbo.DREntry', 'ModifiedDate') IS NULL
BEGIN
    ALTER TABLE dbo.DREntry ADD ModifiedDate DATETIME NULL;
    PRINT 'Added DREntry.ModifiedDate';
END
GO

IF COL_LENGTH('dbo.DREntry', 'CreatedUserID') IS NULL
BEGIN
    ALTER TABLE dbo.DREntry ADD CreatedUserID BIGINT NULL;
    PRINT 'Added DREntry.CreatedUserID';
END
GO

IF COL_LENGTH('dbo.DREntry', 'ModifiedUserID') IS NULL
BEGIN
    ALTER TABLE dbo.DREntry ADD ModifiedUserID BIGINT NULL;
    PRINT 'Added DREntry.ModifiedUserID';
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetById
    @DRID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dr.DRID,
        dr.ReceiptNo,
        dr.ReceiptDate,
        dr.DRHeadID,
        dr.DonorName,
        dr.Address,
        dr.PanNo,
        dr.AadharNo,
        dr.MobileNo,
        dr.Amount,
        dr.PaymentTypeID,
        dr.TransactionNo,
        dr.TransactionDate,
        dr.DepositDate,
        dr.BankName,
        dr.LedgerHeadBankID,
        dr.Remark,
        dr.UserID,
        dr.FyID,
        dr.OrgID,
        dr.OrgIDReceiptNo,
        dr.CreatedDate,
        dr.ModifiedDate,
        dr.CreatedUserID,
        dr.ModifiedUserID,
        dh.DRHeadName,
        om.OrganizationName,
        pt.PaymentType,
        fy.FyName,
        lh.LedgerHead AS DepositBankName
    FROM dbo.DREntry dr
    LEFT JOIN dbo.DRHeadMaster dh ON dh.DRHeadID = dr.DRHeadID
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = dr.OrgID
    LEFT JOIN dbo.PaymentTypeMaster pt ON pt.PaymentTypeID = dr.PaymentTypeID
    LEFT JOIN dbo.FyMaster fy ON fy.FyID = dr.FyID
    LEFT JOIN dbo.ACLedgerHeadMaster lh ON lh.LedgerHeadID = dr.LedgerHeadBankID
    WHERE dr.DRID = @DRID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_Save
    @DRID BIGINT = NULL OUTPUT,
    @ReceiptNo BIGINT = NULL,
    @ReceiptDate DATETIME,
    @DRHeadID BIGINT,
    @DonorName NVARCHAR(200),
    @Address NVARCHAR(500) = NULL,
    @PanNo NVARCHAR(20) = NULL,
    @AadharNo NVARCHAR(20) = NULL,
    @MobileNo NVARCHAR(20) = NULL,
    @Amount NUMERIC(18, 2),
    @PaymentTypeID BIGINT = NULL,
    @TransactionNo NVARCHAR(100) = NULL,
    @TransactionDate DATE = NULL,
    @DepositDate DATETIME = NULL,
    @BankName NVARCHAR(200) = NULL,
    @LedgerHeadBankID BIGINT = NULL,
    @Remark NVARCHAR(MAX) = NULL,
    @UserID BIGINT,
    @FyID BIGINT,
    @OrgID BIGINT,
    @OrgIDReceiptNo BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    IF @DRID IS NULL OR @DRID = 0
    BEGIN
        IF @ReceiptNo IS NULL OR @ReceiptNo = 0
        BEGIN
            SELECT @ReceiptNo = ISNULL(MAX(dr.ReceiptNo), 0) + 1
            FROM dbo.DREntry dr WITH (UPDLOCK, HOLDLOCK)
            WHERE dr.FyID = @FyID;
        END

        IF @OrgIDReceiptNo IS NULL OR @OrgIDReceiptNo = 0
        BEGIN
            SELECT @OrgIDReceiptNo = ISNULL(MAX(dr.OrgIDReceiptNo), 0) + 1
            FROM dbo.DREntry dr WITH (UPDLOCK, HOLDLOCK)
            WHERE dr.OrgID = @OrgID
              AND dr.FyID = @FyID;
        END

        INSERT INTO dbo.DREntry (
            ReceiptNo, ReceiptDate, DRHeadID, DonorName, Address, PanNo, AadharNo, MobileNo,
            Amount, PaymentTypeID, TransactionNo, TransactionDate, DepositDate,
            BankName, LedgerHeadBankID, Remark, UserID, FyID, OrgID, OrgIDReceiptNo,
            CreatedDate, CreatedUserID, ModifiedDate, ModifiedUserID
        )
        VALUES (
            @ReceiptNo, @ReceiptDate, @DRHeadID, @DonorName, @Address, @PanNo, @AadharNo, @MobileNo,
            @Amount, @PaymentTypeID, @TransactionNo, @TransactionDate, @DepositDate,
            @BankName, @LedgerHeadBankID, @Remark, @UserID, @FyID, @OrgID, @OrgIDReceiptNo,
            GETDATE(), @UserID, GETDATE(), @UserID
        );

        SET @DRID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.DREntry
        SET ReceiptDate = @ReceiptDate,
            DRHeadID = @DRHeadID,
            DonorName = @DonorName,
            Address = @Address,
            PanNo = @PanNo,
            AadharNo = @AadharNo,
            MobileNo = @MobileNo,
            Amount = @Amount,
            PaymentTypeID = @PaymentTypeID,
            TransactionNo = @TransactionNo,
            TransactionDate = @TransactionDate,
            DepositDate = @DepositDate,
            BankName = @BankName,
            LedgerHeadBankID = @LedgerHeadBankID,
            Remark = @Remark,
            FyID = @FyID,
            OrgID = @OrgID,
            UserID = @UserID,
            ModifiedDate = GETDATE(),
            ModifiedUserID = @UserID
        WHERE DRID = @DRID;
    END

    COMMIT TRANSACTION;
END
GO

PRINT '067_DREntry_Audit_Columns applied.';
GO
