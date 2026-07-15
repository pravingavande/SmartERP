-- Donation detail / school-wise / user-wise report data from vw_DonationReceiptDetail
USE SmartERP;
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
        ISNULL(NULLIF(LTRIM(RTRIM(sanstha.Address)), ''), v.Address) AS SansthaAddress,
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
        ISNULL(NULLIF(LTRIM(RTRIM(v.EmployeeName)), ''), ISNULL(v.EmployeeShortName, '')) AS EmployeeName,
        v.PaymentType,
        SUM(v.Amount) AS Amount,
        COUNT(1) AS TotalReceipts,
        MAX(ISNULL(v.Remark, '')) AS Remark,
        MIN(sanstha.OrganizationName) AS SansthaName,
        MIN(ISNULL(NULLIF(LTRIM(RTRIM(sanstha.Address)), ''), v.Address)) AS SansthaAddress,
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
        ISNULL(NULLIF(LTRIM(RTRIM(v.EmployeeName)), ''), ISNULL(v.EmployeeShortName, '')),
        v.PaymentType
    ORDER BY v.OrganizationName, EmployeeName, v.PaymentType;
END
GO
