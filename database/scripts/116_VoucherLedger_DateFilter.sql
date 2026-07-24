-- Voucher Ledger Report: optional date range filter
-- NOTE: Use 120_VoucherLedger_Report_Fix.sql for the latest procedure (ledger-head + date fixes).
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_VoucherLedger_GetReport
    @OrgID BIGINT,
    @LedgerHeadID BIGINT = NULL,
    @AllLedgerHeads BIT = 0,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrgID IS NULL OR @OrgID <= 0
    BEGIN
        RAISERROR('OrgID is required for Voucher Ledger report.', 16, 1);
        RETURN;
    END;

    DECLARE @LedgerHeadName NVARCHAR(255) = NULL;
    IF @LedgerHeadID IS NOT NULL AND @LedgerHeadID > 0
    BEGIN
        SELECT @LedgerHeadName = LTRIM(RTRIM(lh.LedgerHead))
        FROM dbo.ACLedgerHeadMaster lh
        WHERE lh.LedgerHeadID = @LedgerHeadID;
    END;

    SELECT
        o.OrgID,
        o.OrganizationName,
        ISNULL(NULLIF(LTRIM(RTRIM(o.Address)), ''), '') AS Address,
        ISNULL(NULLIF(LTRIM(RTRIM(o.CityName)), ''), '') AS CityName
    FROM dbo.OrgMaster o
    WHERE o.OrgID = @OrgID;

    SELECT
        ISNULL(NULLIF(LTRIM(RTRIM(v.LedgerHead)), ''), N'—') AS LedgerHead,
        ISNULL(lh.LedgerHeadID, 0) AS LedgerHeadID,
        CAST(v.VDate AS DATE) AS VDate,
        v.VCode,
        v.VType,
        ISNULL(NULLIF(LTRIM(RTRIM(v.LedgerHeadNarration)), ''), N'') AS LedgerHeadNarration,
        ISNULL(v.Amount, 0) AS Amount,
        v.VoucherID
    FROM dbo.vw_VoucherDetailsReport v
    LEFT JOIN dbo.ACLedgerHeadMaster lh
        ON LTRIM(RTRIM(lh.LedgerHead)) = LTRIM(RTRIM(v.LedgerHead))
    WHERE v.OrgID = @OrgID
      AND (@FromDate IS NULL OR CAST(v.VDate AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(v.VDate AS DATE) <= @ToDate)
      AND (
            @AllLedgerHeads = 1
            OR @LedgerHeadID IS NULL
            OR @LedgerHeadID <= 0
            OR (
                @LedgerHeadName IS NOT NULL
                AND LTRIM(RTRIM(v.LedgerHead)) = @LedgerHeadName
            )
          )
    ORDER BY
        ISNULL(NULLIF(LTRIM(RTRIM(v.LedgerHead)), ''), N'—'),
        CAST(v.VDate AS DATE),
        v.VCode,
        v.VoucherID;
END
GO

PRINT '116_VoucherLedger_DateFilter applied.';
GO
