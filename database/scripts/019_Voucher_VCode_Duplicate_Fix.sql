-- Fix duplicate Voucher No when two receipts are saved with the same previewed VCode.
-- Server assigns next VCode on INSERT inside the transaction.

USE SmartERP;
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
