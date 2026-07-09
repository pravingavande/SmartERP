using SmartEPR.Core.DTOs.Audit;

namespace SmartEPR.Core.DTOs.Donation;

public sealed class DRHeadOptionDto
{
    public long DRHeadID { get; init; }
    public string DRHeadName { get; init; } = string.Empty;
}

public sealed class DonationListItemDto
{
    public long DrID { get; init; }
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
    public string? BankName { get; init; }
    public long? LedgerHeadBankID { get; init; }
    public string? DepositBankName { get; init; }
    public string? Remark { get; init; }
    public long? UserID { get; init; }
    public long? FyID { get; init; }
    public long? OrgID { get; init; }
    public long? OrgIDReceiptNo { get; init; }
    public string? DRHeadName { get; init; }
    public string? OrganizationName { get; init; }
    public string? PaymentType { get; init; }
    public string? FyName { get; init; }
}

public sealed class SaveDonationRequestDto
{
    public long? DrID { get; init; }
    public long? ReceiptNo { get; init; }
    public DateTime ReceiptDate { get; init; }
    public long DRHeadID { get; init; }
    public string DonorName { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? PanNo { get; init; }
    public string? AadharNo { get; init; }
    public string? MobileNo { get; init; }
    public decimal Amount { get; init; }
    public long? PaymentTypeID { get; init; }
    public string? TransactionNo { get; init; }
    public DateTime? TransactionDate { get; init; }
    public DateTime? DepositDate { get; init; }
    public string? BankName { get; init; }
    public long? LedgerHeadBankID { get; init; }
    public string? Remark { get; init; }
    public long FyID { get; init; }
    public long OrgID { get; init; }
    public long? OrgIDReceiptNo { get; init; }
}

public sealed class DonationLookupsDto
{
    public IReadOnlyList<OrgOptionDto> Orgs { get; init; } = [];
    public IReadOnlyList<DRHeadOptionDto> DrHeads { get; init; } = [];
    public IReadOnlyList<PaymentTypeOptionDto> PaymentTypes { get; init; } = [];
    public IReadOnlyList<FyOptionDto> FyList { get; init; } = [];
    public IReadOnlyList<LedgerHeadOptionDto> BankLedgerHeads { get; init; } = [];
}

public sealed class DRHeadDefineDto
{
    public long OrgID { get; init; }
    public IReadOnlyList<long> DRHeadIds { get; init; } = [];
}

public sealed class SaveDRHeadDefineRequestDto
{
    public long OrgID { get; init; }
    public IReadOnlyList<long> DRHeadIds { get; init; } = [];
}
