namespace SmartEPR.Core.Entities;

/// <summary>
/// Donation receipt entry (DREntry).
/// </summary>
public sealed class DREntry
{
    public long DRID { get; init; }
    public long? ReceiptNo { get; init; }
    public DateTime? ReceiptDate { get; init; }
    public long? DRHeadID { get; init; }
    public string? DonorName { get; init; }
    public string? Address { get; init; }
    public string? PanNo { get; init; }
    public string? AadharNo { get; init; }
    public string? MobileNo { get; init; }
    public decimal? Amount { get; init; }
    public long? PaymentTypeID { get; init; }
    public string? TransactionNo { get; init; }
    public DateTime? TransactionDate { get; init; }
    public DateTime? DepositDate { get; init; }
    public string? Remark { get; init; }
    public long? UserID { get; init; }
    public long? FyID { get; init; }
    public long? OrgID { get; init; }
    public long? OrgIDReceiptNo { get; init; }
    public string? BankName { get; init; }
    public long? LedgerHeadBankID { get; init; }
    public DateTime? CreatedDate { get; init; }
    public DateTime? ModifiedDate { get; init; }
    public long? CreatedUserID { get; init; }
    public long? ModifiedUserID { get; init; }
}
