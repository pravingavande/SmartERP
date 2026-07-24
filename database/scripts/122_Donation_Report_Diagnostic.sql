-- Donation report diagnostics — run on SmartERP_TESTING (live API database)
SET NOCOUNT ON;

PRINT '=== 1. Donation table data ===';
SELECT
    COUNT(*) AS TotalDonations,
    MIN(CAST(ReceiptDate AS DATE)) AS EarliestReceipt,
    MAX(CAST(ReceiptDate AS DATE)) AS LatestReceipt
FROM dbo.DREntry;

PRINT '=== 2. Donations by school (top 20) ===';
SELECT TOP 20
    dr.OrgID,
    om.OrganizationName,
    COUNT(*) AS ReceiptCount,
    SUM(dr.Amount) AS TotalAmount
FROM dbo.DREntry dr
LEFT JOIN dbo.OrgMaster om ON om.OrgID = dr.OrgID
GROUP BY dr.OrgID, om.OrganizationName
ORDER BY ReceiptCount DESC;

PRINT '=== 3. Report objects exist? ===';
SELECT
    OBJECT_ID(N'dbo.DREntry', N'U') AS DREntryTable,
    OBJECT_ID(N'dbo.vw_DonationReceiptDetail', N'V') AS DonationView,
    OBJECT_ID(N'dbo.sp_Donation_GetReportDetail', N'P') AS SpReportDetail,
    OBJECT_ID(N'dbo.sp_Donation_GetReportUserSummary', N'P') AS SpReportUserSummary;

PRINT '=== 4. View row count (0 = view missing or empty — run 122_Donation_Report_Fix.sql) ===';
IF OBJECT_ID(N'dbo.vw_DonationReceiptDetail', N'V') IS NOT NULL
    SELECT COUNT(*) AS ViewRowCount FROM dbo.vw_DonationReceiptDetail;
ELSE
    SELECT CAST(NULL AS INT) AS ViewRowCount;

PRINT '=== 5. Report SP test — all schools, wide date range ===';
IF OBJECT_ID(N'dbo.sp_Donation_GetReportDetail', N'P') IS NOT NULL
BEGIN
    EXEC dbo.sp_Donation_GetReportDetail
        @OrgID = NULL,
        @DRHeadID = NULL,
        @PaymentTypeID = NULL,
        @MinAmount = NULL,
        @FromDate = '2020-01-01',
        @ToDate = '2030-12-31';
END
ELSE
    PRINT 'sp_Donation_GetReportDetail not found — run 052 and 122 scripts.';

GO
