-- Donation bank/cheque fields + audit dashboard register list fix
USE SmartERP;
GO

IF COL_LENGTH('dbo.DREntry', 'BankName') IS NULL
    ALTER TABLE dbo.DREntry ADD BankName NVARCHAR(200) NULL;
GO

IF COL_LENGTH('dbo.DREntry', 'LedgerHeadBankID') IS NULL
    ALTER TABLE dbo.DREntry ADD LedgerHeadBankID BIGINT NULL;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetList
    @OrgID BIGINT = NULL,
    @FyID BIGINT = NULL
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
    WHERE (@OrgID IS NULL OR dr.OrgID = @OrgID)
      AND (@FyID IS NULL OR dr.FyID = @FyID)
    ORDER BY dr.ReceiptDate DESC, dr.DRID DESC;
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

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetDashboard
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserOrgID BIGINT;
    DECLARE @UserSchoolCode BIGINT;
    DECLARE @SansthaOrgID BIGINT;
    DECLARE @IsSansthaUser BIT = 0;

    SELECT
        @UserOrgID = um.OrgID,
        @UserSchoolCode = um.SchoolCode
    FROM dbo.UserMaster um
    WHERE um.UserID = @UserID
      AND um.IsActive = 1;

    SELECT TOP 1
        @SansthaOrgID = s.OrgID
    FROM dbo.OrgMaster s
    WHERE s.Status = 1
      AND s.OrgID = s.UnderOrgID
      AND (
          s.SchoolCode = @UserSchoolCode
          OR EXISTS (
              SELECT 1
              FROM dbo.OrgMaster sch
              WHERE sch.SchoolCode = @UserSchoolCode
                AND sch.Status = 1
                AND sch.UnderOrgID = s.OrgID
          )
      )
    ORDER BY s.OrgID;

    IF @SansthaOrgID IS NULL
    BEGIN
        SELECT @SansthaOrgID = om.UnderOrgID
        FROM dbo.OrgMaster om
        WHERE om.OrgID = @UserOrgID
          AND om.Status = 1;

        IF @SansthaOrgID IS NULL
            SET @SansthaOrgID = @UserOrgID;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.OrgMaster s
        WHERE s.OrgID = @SansthaOrgID
          AND s.OrgID = s.UnderOrgID
          AND (
              s.SchoolCode = @UserSchoolCode
              OR @UserOrgID = @SansthaOrgID
          )
    )
        SET @IsSansthaUser = 1;

    SELECT
        om.OrgID,
        om.OrganizationName,
        arm.AccountRegisterID,
        arm.AccountRegister,
        lastV.LastTransactionDate,
        ISNULL(bal.BankBalance, 0) AS BankBalance,
        CASE
            WHEN arm.AccountRegister LIKE N'%Cash%' OR arm.AccountRegister LIKE N'%रोख%' THEN
                CASE WHEN ISNULL(vtype.SampleVType, N'R') = N'R' THEN N'Receipt Voucher - Cash' ELSE N'Payment Voucher - Cash' END
            ELSE
                CASE WHEN ISNULL(vtype.SampleVType, N'R') = N'R' THEN N'Receipt Voucher - Bank' ELSE N'Payment Voucher - Bank' END
        END AS VoucherCategory
    FROM dbo.OrgMaster om
    INNER JOIN dbo.ACAccountRegisterOrgWiseDefine ard
        ON ard.UnderOrgID = CASE
            WHEN EXISTS (
                SELECT 1
                FROM dbo.ACAccountRegisterOrgWiseDefine own
                WHERE own.UnderOrgID = om.OrgID
            ) THEN om.OrgID
            ELSE ISNULL(om.UnderOrgID, om.OrgID)
        END
    INNER JOIN dbo.ACAccountRegisterMaster arm
        ON arm.AccountRegisterID = ard.AccountRegisterID
       AND arm.IsActive = 1
    OUTER APPLY (
        SELECT MAX(v.VDate) AS LastTransactionDate
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
    ) lastV
    OUTER APPLY (
        SELECT
            SUM(
                CASE
                    WHEN v.VType IN (N'R', N'RV') THEN ISNULL(v.TotalAmount, 0)
                    WHEN v.VType IN (N'P', N'PV') THEN -ISNULL(v.TotalAmount, 0)
                    ELSE 0
                END
            ) AS BankBalance
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
    ) bal
    OUTER APPLY (
        SELECT TOP 1 v.VType AS SampleVType
        FROM dbo.ACVoucher v
        WHERE v.OrgID = om.OrgID
          AND v.AccountRegisterID = arm.AccountRegisterID
        ORDER BY v.VDate DESC, v.VoucherID DESC
    ) vtype
    WHERE om.Status = 1
      AND (
          (@IsSansthaUser = 1 AND (om.OrgID = @SansthaOrgID OR om.UnderOrgID = @SansthaOrgID))
          OR (@IsSansthaUser = 0 AND (om.OrgID = @UserOrgID OR om.SchoolCode = @UserSchoolCode))
      )
    ORDER BY om.OrganizationName, arm.AccountRegister;
END
GO
