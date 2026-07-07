namespace SmartEPR.Core.DTOs.Audit;

public sealed class OrgOptionDto
{
    public long OrgID { get; init; }
    public string OrganizationName { get; init; } = string.Empty;
    public string? ShortName { get; init; }
    public long? SchoolCode { get; init; }
}

public sealed class AccountRegisterOptionDto
{
    public long AccountRegisterID { get; init; }
    public string AccountRegister { get; init; } = string.Empty;
    public long OrgID { get; init; }
}

public sealed class PartyOptionDto
{
    public long PartyID { get; init; }
    public string? PartyCode { get; init; }
    public string PartyName { get; init; } = string.Empty;
    public string? MobNo { get; init; }
}

public sealed class PaymentTypeOptionDto
{
    public long PaymentTypeID { get; init; }
    public string PaymentType { get; init; } = string.Empty;
}

public sealed class FyOptionDto
{
    public long FyID { get; init; }
    public string FyName { get; init; } = string.Empty;
    public DateTime FromDate { get; init; }
    public DateTime ToDate { get; init; }
}

public sealed class LedgerHeadOptionDto
{
    public long LedgerHeadID { get; init; }
    public string LedgerHead { get; init; } = string.Empty;
    public string? LedgerHeadShort { get; init; }
    public long? LedgerTypeID { get; init; }
}

public sealed class VoucherListItemDto
{
    public long VoucherID { get; init; }
    public long OrgID { get; init; }
    public long AccountRegisterID { get; init; }
    public string VType { get; init; } = string.Empty;
    public long VCode { get; init; }
    public DateTime VDate { get; init; }
    public long? PartyTID { get; init; }
    public decimal TotalAmount { get; init; }
    public string? Remark { get; init; }
    public long? PaymentTypeID { get; init; }
    public long FyID { get; init; }
    public string? OrganizationName { get; init; }
    public string? AccountRegister { get; init; }
    public string? PartyName { get; init; }
    public string? PaymentType { get; init; }
}

public sealed class VoucherDetailDto
{
    public long VoucherDetailID { get; init; }
    public long VoucherID { get; init; }
    public long SrNo { get; init; }
    public long LedgerHeadID { get; init; }
    public string? LedgerHeadNarration { get; init; }
    public decimal Amount { get; init; }
    public string? LedgerHead { get; init; }
}

public sealed class VoucherDto
{
    public long VoucherID { get; init; }
    public long OrgID { get; init; }
    public long AccountRegisterID { get; init; }
    public string VType { get; init; } = string.Empty;
    public long VCode { get; init; }
    public DateTime VDate { get; init; }
    public long? PartyTID { get; init; }
    public decimal TotalAmount { get; init; }
    public string? Remark { get; init; }
    public long? PaymentTypeID { get; init; }
    public string? TransactionNo { get; init; }
    public DateTime? TransactionDate { get; init; }
    public DateTime? DepositDate { get; init; }
    public long? LedgerHeadBankID { get; init; }
    public string? FilePath { get; init; }
    public long UserID { get; init; }
    public long FyID { get; init; }
    public string? OrganizationName { get; init; }
    public string? AccountRegister { get; init; }
    public string? PartyName { get; init; }
    public string? PaymentType { get; init; }
    public string? FyName { get; init; }
    public IReadOnlyList<VoucherDetailDto> Details { get; init; } = [];
}

public sealed class VoucherDetailLineRequestDto
{
    public long SrNo { get; init; }
    public long LedgerHeadId { get; init; }
    public string? LedgerHeadNarration { get; init; }
    public decimal Amount { get; init; }
}

public sealed class SaveVoucherRequestDto
{
    public long? VoucherID { get; init; }
    public long OrgID { get; init; }
    public long AccountRegisterID { get; init; }
    public string VType { get; init; } = string.Empty;
    public long VCode { get; init; }
    public DateTime VDate { get; init; }
    public long? PartyTID { get; init; }
    public string? Remark { get; init; }
    public long? PaymentTypeID { get; init; }
    public string? TransactionNo { get; init; }
    public DateTime? TransactionDate { get; init; }
    public DateTime? DepositDate { get; init; }
    public long? LedgerHeadBankID { get; init; }
    public string? FilePath { get; init; }
    public long FyID { get; init; }
    public IReadOnlyList<VoucherDetailLineRequestDto> Details { get; init; } = [];
}

public sealed class AuditDashboardRowDto
{
    public long OrgID { get; init; }
    public string OrganizationName { get; init; } = string.Empty;
    public long AccountRegisterID { get; init; }
    public string AccountRegister { get; init; } = string.Empty;
    public DateTime? LastTransactionDate { get; init; }
    public decimal BankBalance { get; init; }
    public string VoucherCategory { get; init; } = string.Empty;
}

public sealed class AuditLookupsDto
{
    public IReadOnlyList<OrgOptionDto> Orgs { get; init; } = [];
    public IReadOnlyList<PaymentTypeOptionDto> PaymentTypes { get; init; } = [];
    public IReadOnlyList<FyOptionDto> FyList { get; init; } = [];
    public IReadOnlyList<LedgerHeadOptionDto> LedgerHeads { get; init; } = [];
    public IReadOnlyList<LedgerHeadOptionDto> BankLedgerHeads { get; init; } = [];
}
