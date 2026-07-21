-- ============================================================
-- Cash Book opening balance: include RV/PV/BD/BW (matches AuditVoucherRules)
-- Procedure-only change — no table data is modified.
-- ============================================================
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_CashBook_GetReport
    @OrgID BIGINT,
    @FromDate DATE,
    @ToDate DATE,
    @AccountRegisterID BIGINT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('OrgID is required for Cash Book report.', 16, 1);
        RETURN;
    END;

    IF @FromDate IS NULL OR @ToDate IS NULL
    BEGIN
        RAISERROR('FromDate and ToDate are required for Cash Book report.', 16, 1);
        RETURN;
    END;

    /* Result set 1 — header + opening balance (before FromDate) */
    SELECT
        o.OrgID,
        o.OrganizationName,
        ISNULL(LTRIM(RTRIM(o.Address)), '') AS Address,
        ISNULL(LTRIM(RTRIM(o.CityName)), '') AS CityName,
        @FromDate AS FromDate,
        @ToDate AS ToDate,
        ISNULL((
            SELECT
                SUM(CASE
                    WHEN UPPER(LTRIM(RTRIM(v2.VType))) IN ('R', 'RECEIPT', 'RV', 'BD')
                        THEN ISNULL(v2.Amount, 0)
                    ELSE 0
                END)
                - SUM(CASE
                    WHEN UPPER(LTRIM(RTRIM(v2.VType))) IN ('P', 'PAYMENT', 'PV', 'BW')
                        THEN ISNULL(v2.Amount, 0)
                    ELSE 0
                END)
            FROM dbo.vw_VoucherDetailsReport v2
            INNER JOIN dbo.ACVoucher av2 ON av2.VoucherID = v2.VoucherID
            WHERE v2.OrgID = @OrgID
              AND av2.AccountRegisterID = @AccountRegisterID
              AND CAST(v2.VDate AS DATE) < @FromDate
        ), 0) AS OpeningBalance,
        ISNULL((
            SELECT TOP 1 arm.AccountRegister
            FROM dbo.ACAccountRegisterMaster arm
            WHERE arm.AccountRegisterID = @AccountRegisterID
        ), 'Cash Book') AS AccountRegister
    FROM dbo.OrgMaster o
    WHERE o.OrgID = @OrgID;

    /* Result set 2 — voucher lines in range */
    SELECT
        v.VoucherID,
        v.OrgID,
        v.OrganizationName,
        v.AccountRegister,
        v.VType,
        v.VCode,
        CAST(v.VDate AS DATE) AS VDate,
        v.LedgerHead,
        v.LedgerHeadNarration,
        ISNULL(v.Amount, 0) AS Amount
    FROM dbo.vw_VoucherDetailsReport v
    INNER JOIN dbo.ACVoucher av ON av.VoucherID = v.VoucherID
    WHERE v.OrgID = @OrgID
      AND av.AccountRegisterID = @AccountRegisterID
      AND CAST(v.VDate AS DATE) >= @FromDate
      AND CAST(v.VDate AS DATE) <= @ToDate
    ORDER BY CAST(v.VDate AS DATE), v.VoucherID, v.LedgerHead;
END
GO

PRINT '084_CashBook_VType_OpeningBalance applied (procedure only).';
GO
