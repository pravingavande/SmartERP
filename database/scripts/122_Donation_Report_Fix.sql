-- Donation reports fix: create missing vw_DonationReceiptDetail and align report SPs with DREntry
-- Run on SmartERP_TESTING (same DB as live API connection string).
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.vw_DonationReceiptDetail', N'V') IS NULL
    EXEC(N'CREATE VIEW dbo.vw_DonationReceiptDetail AS SELECT 1 AS Placeholder');
GO

CREATE OR ALTER VIEW dbo.vw_DonationReceiptDetail
AS
SELECT
    dr.DRID,
    dr.ReceiptNo,
    dr.OrgIDReceiptNo,
    dr.ReceiptDate,
    dr.OrgID,
    dr.DRHeadID,
    dr.PaymentTypeID,
    school.OrganizationName,
    ISNULL(NULLIF(LTRIM(RTRIM(sanstha.EstablishmentYear)), N''), school.EstablishmentYear) AS EstablishmentYear,
    ISNULL(NULLIF(LTRIM(RTRIM(sanstha.RegNo)), N''), school.RegNo) AS RegNo,
    ISNULL(NULLIF(LTRIM(RTRIM(sanstha.Permission80G)), N''), school.Permission80G) AS Permission80G,
    fy.FyName,
    dh.DRHeadName,
    dr.DonorName,
    dr.MobileNo,
    dr.PanNo,
    dr.AadharNo,
    dr.Address,
    pt.PaymentType,
    dr.BankName,
    dr.TransactionNo,
    dr.TransactionDate,
    dr.DepositDate,
    dr.Amount,
    dr.Remark,
    dr.UserID,
    um.EmployeeName,
    um.EmployeeShortName
FROM dbo.DREntry dr
LEFT JOIN dbo.DRHeadMaster dh ON dh.DRHeadID = dr.DRHeadID
LEFT JOIN dbo.OrgMaster school ON school.OrgID = dr.OrgID
LEFT JOIN dbo.OrgMaster sanstha ON sanstha.OrgID = school.UnderOrgID
LEFT JOIN dbo.PaymentTypeMaster pt ON pt.PaymentTypeID = dr.PaymentTypeID
LEFT JOIN dbo.FyMaster fy ON fy.FyID = dr.FyID
LEFT JOIN dbo.UserMaster um ON um.UserID = dr.UserID;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetReportDetail
    @OrgID BIGINT = NULL,
    @DRHeadID BIGINT = NULL,
    @PaymentTypeID BIGINT = NULL,
    @MinAmount NUMERIC(18, 2) = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        v.DRID,
        v.ReceiptNo,
        v.OrgIDReceiptNo,
        v.ReceiptDate,
        v.OrganizationName,
        sanstha.OrganizationName AS SansthaName,
        ISNULL(NULLIF(LTRIM(RTRIM(sanstha.Address)), N''), v.Address) AS SansthaAddress,
        v.EstablishmentYear,
        v.RegNo,
        v.Permission80G,
        v.FyName,
        v.DRHeadName,
        v.DonorName,
        v.MobileNo,
        v.PanNo,
        v.AadharNo,
        v.Address,
        v.PaymentType,
        v.BankName,
        v.TransactionNo,
        v.TransactionDate,
        v.DepositDate,
        v.Amount,
        v.Remark,
        v.UserID,
        v.EmployeeName,
        v.EmployeeShortName
    FROM dbo.vw_DonationReceiptDetail v
    LEFT JOIN dbo.OrgMaster school ON school.OrgID = v.OrgID
    LEFT JOIN dbo.OrgMaster sanstha ON sanstha.OrgID = school.UnderOrgID
    WHERE (@OrgID IS NULL OR v.OrgID = @OrgID)
      AND (@DRHeadID IS NULL OR v.DRHeadID = @DRHeadID)
      AND (@PaymentTypeID IS NULL OR v.PaymentTypeID = @PaymentTypeID)
      AND (@MinAmount IS NULL OR v.Amount >= @MinAmount)
      AND (@FromDate IS NULL OR CAST(v.ReceiptDate AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(v.ReceiptDate AS DATE) <= @ToDate)
    ORDER BY v.ReceiptDate, v.OrgIDReceiptNo, v.ReceiptNo;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Donation_GetReportUserSummary
    @OrgID BIGINT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MIN(v.ReceiptNo) AS ReceiptNo,
        v.OrganizationName,
        ISNULL(NULLIF(LTRIM(RTRIM(v.EmployeeName)), N''), ISNULL(v.EmployeeShortName, N'')) AS EmployeeName,
        v.PaymentType,
        SUM(v.Amount) AS Amount,
        COUNT(1) AS TotalReceipts,
        MAX(ISNULL(v.Remark, N'')) AS Remark,
        MIN(sanstha.OrganizationName) AS SansthaName,
        MIN(ISNULL(NULLIF(LTRIM(RTRIM(sanstha.Address)), N''), v.Address)) AS SansthaAddress,
        MIN(v.EstablishmentYear) AS EstablishmentYear,
        MIN(v.RegNo) AS RegNo,
        MIN(v.Permission80G) AS Permission80G
    FROM dbo.vw_DonationReceiptDetail v
    LEFT JOIN dbo.OrgMaster school ON school.OrgID = v.OrgID
    LEFT JOIN dbo.OrgMaster sanstha ON sanstha.OrgID = school.UnderOrgID
    WHERE (@OrgID IS NULL OR v.OrgID = @OrgID)
      AND (@FromDate IS NULL OR CAST(v.ReceiptDate AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(v.ReceiptDate AS DATE) <= @ToDate)
    GROUP BY
        v.OrganizationName,
        v.UserID,
        ISNULL(NULLIF(LTRIM(RTRIM(v.EmployeeName)), N''), ISNULL(v.EmployeeShortName, N'')),
        v.PaymentType
    ORDER BY v.OrganizationName, EmployeeName, v.PaymentType;
END
GO

PRINT '122_Donation_Report_Fix applied.';
GO

-- Quick verification (run manually after deploy):
-- SELECT COUNT(*) AS DonationsInDREntry FROM dbo.DREntry;
-- SELECT COUNT(*) AS RowsInView FROM dbo.vw_DonationReceiptDetail;
-- EXEC dbo.sp_Donation_GetReportDetail @OrgID = NULL, @FromDate = '2025-04-01', @ToDate = '2026-12-31';
