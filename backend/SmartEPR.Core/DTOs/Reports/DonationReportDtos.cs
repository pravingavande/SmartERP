namespace SmartEPR.Core.DTOs.Reports;

public sealed class DonationReportFilterDto
{
    public long? OrgID { get; init; }
    public long? DRHeadID { get; init; }
    public long? PaymentTypeID { get; init; }
    public decimal? MinAmount { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
}

public sealed class DonationReportDetailRowDto
{
    public long DRID { get; init; }
    public long? ReceiptNo { get; init; }
    public long? OrgIDReceiptNo { get; init; }
    public DateTime? ReceiptDate { get; init; }
    public string? OrganizationName { get; init; }
    public string? SansthaName { get; init; }
    public string? SansthaAddress { get; init; }
    public string? EstablishmentYear { get; init; }
    public string? RegNo { get; init; }
    public string? Permission80G { get; init; }
    public string? FyName { get; init; }
    public string? DRHeadName { get; init; }
    public string? DonorName { get; init; }
    public string? MobileNo { get; init; }
    public string? PanNo { get; init; }
    public string? AadharNo { get; init; }
    public string? Address { get; init; }
    public string? PaymentType { get; init; }
    public string? BankName { get; init; }
    public string? TransactionNo { get; init; }
    public DateTime? TransactionDate { get; init; }
    public DateTime? DepositDate { get; init; }
    public decimal? Amount { get; init; }
    public string? Remark { get; init; }
    public long? UserID { get; init; }
    public string? EmployeeName { get; init; }
    public string? EmployeeShortName { get; init; }
}

public sealed class DonationReportUserSummaryRowDto
{
    public long? ReceiptNo { get; init; }
    public string? OrganizationName { get; init; }
    public string? EmployeeName { get; init; }
    public string? PaymentType { get; init; }
    public decimal? Amount { get; init; }
    public int TotalReceipts { get; init; }
    public string? Remark { get; init; }
    public string? SansthaName { get; init; }
    public string? SansthaAddress { get; init; }
    public string? EstablishmentYear { get; init; }
    public string? RegNo { get; init; }
    public string? Permission80G { get; init; }
}
