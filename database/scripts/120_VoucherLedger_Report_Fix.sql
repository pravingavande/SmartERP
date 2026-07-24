-- Voucher Ledger Report: fix ledger-head filter, date range, org-scoped join
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
    DECLARE @SansthaOrgID BIGINT = NULL;

    SELECT @SansthaOrgID = CASE
        WHEN om.UnderOrgID IS NOT NULL
         AND om.UnderOrgID > 0
         AND om.UnderOrgID <> om.OrgID
            THEN om.UnderOrgID
        ELSE om.OrgID
    END
    FROM dbo.OrgMaster om
    WHERE om.OrgID = @OrgID
      AND ISNULL(om.IsActive, 1) = 1;

    IF @LedgerHeadID IS NOT NULL AND @LedgerHeadID > 0
    BEGIN
        SELECT @LedgerHeadName = COALESCE(
            NULLIF(LTRIM(RTRIM((
                SELECT TOP 1 lh.LedgerHead
                FROM dbo.ACLedgerHeadMaster lh
                WHERE lh.LedgerHeadID = @LedgerHeadID
            ))), N''),
            NULLIF(LTRIM(RTRIM((
                SELECT TOP 1 v.LedgerHead
                FROM dbo.VW_LedgerHeadList_Receipt v
                WHERE v.LedgerHeadID = @LedgerHeadID
            ))), N''),
            NULLIF(LTRIM(RTRIM((
                SELECT TOP 1 v.LedgerHead
                FROM dbo.VW_LedgerHeadList_Payment v
                WHERE v.LedgerHeadID = @LedgerHeadID
            ))), N''),
            NULLIF(LTRIM(RTRIM((
                SELECT TOP 1 v.LedgerHead
                FROM dbo.VW_LedgerHeadList_Bank v
                WHERE v.LedgerHeadID = @LedgerHeadID
            ))), N'')
        );
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
       AND (
            @SansthaOrgID IS NULL
            OR lh.UnderOrgID = @SansthaOrgID
            OR lh.OrgID = @SansthaOrgID
            OR lh.OrgID = @OrgID
       )
    WHERE v.OrgID = @OrgID
      AND (@FromDate IS NULL OR CAST(v.VDate AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(v.VDate AS DATE) <= @ToDate)
      AND (
            @AllLedgerHeads = 1
            OR @LedgerHeadID IS NULL
            OR @LedgerHeadID <= 0
            OR ISNULL(lh.LedgerHeadID, 0) = @LedgerHeadID
            OR (
                @LedgerHeadName IS NOT NULL
                AND LTRIM(RTRIM(v.LedgerHead)) = @LedgerHeadName
            )
            OR EXISTS (
                SELECT 1
                FROM dbo.ACVoucherDetail d
                WHERE d.VoucherID = v.VoucherID
                  AND d.LedgerHeadID = @LedgerHeadID
            )
          )
    ORDER BY
        ISNULL(NULLIF(LTRIM(RTRIM(v.LedgerHead)), ''), N'—'),
        CAST(v.VDate AS DATE),
        v.VCode,
        v.VoucherID;
END
GO

PRINT '120_VoucherLedger_Report_Fix applied.';
GO
