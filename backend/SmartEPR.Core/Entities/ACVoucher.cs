namespace SmartEPR.Core.Entities;

/// <summary>
/// Audit voucher header (ACVoucher).
/// </summary>
public sealed class ACVoucher
{
    public long VoucherID { get; init; }
    public long? OrgID { get; init; }
    public long? AccountRegisterID { get; init; }
    public string? VType { get; init; }
    public long? VCode { get; init; }
    public DateTime? VDate { get; init; }
    public long? PartyTID { get; init; }
    public decimal? TotalAmount { get; init; }
    public string? Remark { get; init; }
    public long? PaymentTypeID { get; init; }
    public string? BankName { get; init; }
    public string? TransactionNo { get; init; }
    public DateTime? TransactionDate { get; init; }
    public DateTime? DepositDate { get; init; }
    public long? LedgerHeadBankID { get; init; }
    public string? FilePath { get; init; }
    public long? UserID { get; init; }
    public long? FyID { get; init; }
    public DateTime? CreatedDate { get; init; }
    public DateTime? ModifiedDate { get; init; }
    public long? CreatedUserID { get; init; }
    public long? ModifiedUserID { get; init; }
}
