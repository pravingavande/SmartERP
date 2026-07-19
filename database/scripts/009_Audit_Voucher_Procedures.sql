-- Audit / Voucher module stored procedures
-- Rules: no SELECT *, no MERGE, no BETWEEN
-- VType: R = Receipt Voucher, P = Payment Voucher

USE SmartERP;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetUserOrgs
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

    SELECT DISTINCT
        om.OrgID,
        om.OrganizationName,
        om.ShortName,
        om.SchoolCode
    FROM dbo.OrgMaster om
    WHERE om.Status = 1
      AND (
          (@IsSansthaUser = 1 AND (om.OrgID = @SansthaOrgID OR om.UnderOrgID = @SansthaOrgID))
          OR (@IsSansthaUser = 0 AND (om.OrgID = @UserOrgID OR om.SchoolCode = @UserSchoolCode))
      )
    ORDER BY om.OrganizationName;
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
            WHERE ard.OrgID = @LookupOrgID
        )
            BREAK;

        SELECT @LookupOrgID = parent.UnderOrgID
        FROM dbo.OrgMaster child
        INNER JOIN dbo.OrgMaster parent ON parent.OrgID = child.UnderOrgID
        WHERE child.OrgID = @LookupOrgID
          AND child.OrgID <> child.UnderOrgID
          AND parent.Status = 1;

        IF @@ROWCOUNT = 0
            SET @LookupOrgID = NULL;
    END

    SELECT
        arm.AccountRegisterID,
        arm.AccountRegister,
        @OrgID AS OrgID
    FROM dbo.ACAccountRegisterOrgWiseDefine ard
    INNER JOIN dbo.ACAccountRegisterMaster arm ON arm.AccountRegisterID = ard.AccountRegisterID
    WHERE ard.OrgID = @LookupOrgID
      AND arm.IsActive = 1
    ORDER BY arm.AccountRegister;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetParties
    @OrgID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pm.PartyID,
        pm.PartyCode,
        pm.PartyName,
        pm.MobNo
    FROM dbo.PartyMaster pm
    WHERE pm.OrgID = @OrgID
      AND pm.IsActive = 1
    ORDER BY pm.PartyName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetPaymentTypes
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pt.PaymentTypeID,
        pt.PaymentType
    FROM dbo.PaymentTypeMaster pt
    WHERE pt.IsActive = 1
    ORDER BY pt.PaymentTypeID;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetFyList
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        fy.FyID,
        fy.FyName,
        fy.FromDate,
        fy.ToDate
    FROM dbo.FyMaster fy
    WHERE fy.IsActive = 1
    ORDER BY fy.FromDate DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetLedgerHeads
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lh.LedgerHeadCode AS LedgerHeadID,
        lh.LedgerHead,
        lh.LedgerHeadEng,
        lh.LedgerTypeID
    FROM dbo.ACLedgerHeadMaster lh
    WHERE lh.IsActive = 1
    ORDER BY lh.LedgerHead;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetBankLedgerHeads
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lh.LedgerHeadCode AS LedgerHeadID,
        lh.LedgerHead,
        lh.LedgerHeadEng
    FROM dbo.ACLedgerHeadMaster lh
    WHERE lh.IsActive = 1
      AND lh.LedgerTypeID = 2
    ORDER BY lh.LedgerHead;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetLedgerNarrations
    @LedgerHeadID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        n.LedgerHeadNarration
    FROM dbo.ACLedgerHeadNarration n
    WHERE n.LedgerHeadID = @LedgerHeadID
      AND n.LedgerHeadNarration IS NOT NULL
      AND LEN(LTRIM(RTRIM(n.LedgerHeadNarration))) > 0
    ORDER BY n.LedgerHeadNarration;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_SaveLedgerNarration
    @LedgerHeadID BIGINT,
    @LedgerHeadNarration NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ACLedgerHeadNarration n
        WHERE n.LedgerHeadID = @LedgerHeadID
          AND n.LedgerHeadNarration = @LedgerHeadNarration
    )
    BEGIN
        INSERT INTO dbo.ACLedgerHeadNarration (LedgerHeadNarration, LedgerHeadID)
        VALUES (@LedgerHeadNarration, @LedgerHeadID);
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_GetNextVCode
    @OrgID BIGINT,
    @AccountRegisterID BIGINT,
    @FyID BIGINT,
    @VType NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NextCode BIGINT;

    SELECT @NextCode = ISNULL(MAX(v.VCode), 0) + 1
    FROM dbo.ACVoucher v
    WHERE v.OrgID = @OrgID
      AND v.AccountRegisterID = @AccountRegisterID
      AND v.FyID = @FyID
      AND (
          v.VType = @VType
          OR (@VType = N'R' AND v.VType = N'RV')
          OR (@VType = N'P' AND v.VType = N'PV')
      );

    SELECT ISNULL(@NextCode, 1) AS NextVCode;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Voucher_GetList
    @OrgID BIGINT,
    @VType NVARCHAR(10),
    @FyID BIGINT = NULL
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
        v.FyID,
        om.OrganizationName,
        arm.AccountRegister,
        pm.PartyName,
        pt.PaymentType
    FROM dbo.ACVoucher v
    LEFT JOIN dbo.OrgMaster om ON om.OrgID = v.OrgID
    LEFT JOIN dbo.ACAccountRegisterMaster arm ON arm.AccountRegisterID = v.AccountRegisterID
    LEFT JOIN dbo.PartyMaster pm ON pm.PartyID = v.PartyTID
    LEFT JOIN dbo.PaymentTypeMaster pt ON pt.PaymentTypeID = v.PaymentTypeID
    WHERE v.OrgID = @OrgID
      AND (
          v.VType = @VType
          OR (@VType = N'R' AND v.VType = N'RV')
          OR (@VType = N'P' AND v.VType = N'PV')
      )
      AND (@FyID IS NULL OR v.FyID = @FyID)
    ORDER BY v.VDate DESC, v.VoucherID DESC;
END
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

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Voucher_GetDetails
    @VoucherID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        d.VoucherDetailID,
        d.VoucherID,
        d.SrNo,
        d.LedgerHeadID,
        d.LedgerHeadNarration,
        d.Amount,
        lh.LedgerHead
    FROM dbo.ACVoucherDetail d
    LEFT JOIN dbo.ACLedgerHeadMaster lh ON lh.LedgerHeadCode = d.LedgerHeadID
    WHERE d.VoucherID = @VoucherID
    ORDER BY d.SrNo;
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
    @FilePath NVARCHAR(510) = NULL,
    @UserID BIGINT,
    @FyID BIGINT,
    @DetailsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @TotalAmount NUMERIC(18, 2);

    SELECT @TotalAmount = ISNULL(SUM(CAST(JSON_VALUE(d.value, '$.amount') AS NUMERIC(18, 2))), 0)
    FROM OPENJSON(@DetailsJson) d;

    IF @VoucherID IS NULL OR @VoucherID = 0
    BEGIN
        INSERT INTO dbo.ACVoucher (
            OrgID, AccountRegisterID, VType, VCode, VDate, PartyTID, TotalAmount, Remark,
            PaymentTypeID, TransactionNo, TransactionDate, DepositDate, LedgerHeadBankID,
            FilePath, UserID, FyID
        )
        VALUES (
            @OrgID, @AccountRegisterID, @VType, @VCode, @VDate, @PartyTID, @TotalAmount, @Remark,
            @PaymentTypeID, @TransactionNo, @TransactionDate, @DepositDate, @LedgerHeadBankID,
            @FilePath, @UserID, @FyID
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

CREATE OR ALTER PROCEDURE dbo.sp_Audit_Voucher_Delete
    @VoucherID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DELETE FROM dbo.ACVoucherDetail
    WHERE VoucherID = @VoucherID;

    DELETE FROM dbo.ACVoucher
    WHERE VoucherID = @VoucherID;

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
                CASE WHEN vtype.SampleVType = N'R' THEN N'Receipt Voucher - Cash' ELSE N'Payment Voucher - Cash' END
            ELSE
                CASE WHEN vtype.SampleVType = N'R' THEN N'Receipt Voucher - Bank' ELSE N'Payment Voucher - Bank' END
        END AS VoucherCategory
    FROM dbo.OrgMaster om
    CROSS APPLY (
        SELECT TOP 1 ard.AccountRegisterID, ard.OrgID AS RegisterOrgID
        FROM dbo.ACAccountRegisterOrgWiseDefine ard
        WHERE ard.OrgID = om.OrgID
           OR (
               NOT EXISTS (
                   SELECT 1
                   FROM dbo.ACAccountRegisterOrgWiseDefine own
                   WHERE own.OrgID = om.OrgID
               )
               AND ard.OrgID = om.UnderOrgID
           )
        ORDER BY CASE WHEN ard.OrgID = om.OrgID THEN 0 ELSE 1 END
    ) ard
    INNER JOIN dbo.ACAccountRegisterMaster arm ON arm.AccountRegisterID = ard.AccountRegisterID
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
      AND arm.IsActive = 1
      AND (
          (@IsSansthaUser = 1 AND (om.OrgID = @SansthaOrgID OR om.UnderOrgID = @SansthaOrgID))
          OR (@IsSansthaUser = 0 AND (om.OrgID = @UserOrgID OR om.SchoolCode = @UserSchoolCode))
      )
    ORDER BY om.OrganizationName, arm.AccountRegister;
END
GO

PRINT N'Audit voucher procedures created.';
GO
