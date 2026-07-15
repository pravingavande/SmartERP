namespace SmartEPR.Core.DTOs.Reports;

public sealed class DonationReceiptReportRow
{
    public string ReceiptNo { get; init; } = string.Empty;
    public string OrgReceiptNo { get; init; } = string.Empty;
    public string Tid { get; init; } = string.Empty;
    public string ReceiptDate { get; init; } = string.Empty;
    public string OrganizationName { get; init; } = string.Empty;
    public string SansthaName { get; init; } = string.Empty;
    public string SansthaAddress { get; init; } = string.Empty;
    public string EstablishmentYear { get; init; } = string.Empty;
    public string OrgPanNo { get; init; } = string.Empty;
    public string RegistrationNo { get; init; } = string.Empty;
    public string OrderNo80G { get; init; } = string.Empty;
    public string OrderDate80G { get; init; } = string.Empty;
    public string FyName { get; init; } = string.Empty;
    public string DRHeadName { get; init; } = string.Empty;
    public string DonorName { get; init; } = string.Empty;
    public string MobileNo { get; init; } = string.Empty;
    public string PanNo { get; init; } = string.Empty;
    public string AadharNo { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string PaymentType { get; init; } = string.Empty;
    public string BankName { get; init; } = string.Empty;
    public string TransactionNo { get; init; } = string.Empty;
    public string TransactionDate { get; init; } = string.Empty;
    public string DepositDate { get; init; } = string.Empty;
    public string DepositBankName { get; init; } = string.Empty;
    public string AmountText { get; init; } = string.Empty;
    public string AmountNumber { get; init; } = string.Empty;
    public string AmountInWords { get; init; } = string.Empty;
    public string AmountInWordsMarathi { get; init; } = string.Empty;
    public string Remark { get; init; } = string.Empty;
    public string ReceiverSignatureName { get; init; } = string.Empty;
    public string PrintedOn { get; init; } = string.Empty;
    public string UserName { get; init; } = string.Empty;
    public string TotalReceipts { get; init; } = string.Empty;
    public decimal AmountValue { get; init; }
    public string FromDate { get; init; } = string.Empty;
    public string ToDate { get; init; } = string.Empty;
}
