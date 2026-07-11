namespace SmartEPR.Core.DTOs.Audit;

public sealed class OrgOptionDto
{
    public long OrgID { get; init; }
    public string OrganizationName { get; init; } = string.Empty;
    public string? ShortName { get; init; }
    public long? SchoolCode { get; init; }
    public long? UnderOrgID { get; init; }
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
    public string? BankName { get; init; }
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
    public string? BankName { get; init; }
    public string? FilePath { get; init; }
    public long FyID { get; init; }
    public IReadOnlyList<VoucherDetailLineRequestDto> Details { get; init; } = [];
}

public sealed class AccountRegisterMasterOptionDto
{
    public long AccountRegisterID { get; init; }
    public string AccountRegister { get; init; } = string.Empty;
}

public sealed class AccountRegisterDefineDto
{
    public long OrgID { get; init; }
    public IReadOnlyList<long> AccountRegisterIds { get; init; } = [];
}

public sealed class SaveAccountRegisterDefineRequestDto
{
    public long OrgID { get; init; }
    public IReadOnlyList<long> AccountRegisterIds { get; init; } = [];
}

public sealed class PartyMasterDto
{
    public long PartyID { get; init; }
    public long OrgID { get; init; }
    public long? RecordNo { get; init; }
    public string? PartyCode { get; init; }
    public string PartyName { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? MobNo { get; init; }
    public string? PanNo { get; init; }
    public string? GSTNo { get; init; }
    public bool IsActive { get; init; }
}

public sealed class SavePartyRequestDto
{
    public long? PartyID { get; init; }
    public long OrgID { get; init; }
    public string PartyName { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? MobNo { get; init; }
    public string? PanNo { get; init; }
    public string? GSTNo { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed class LedgerTypeOptionDto
{
    public long LedgerTypeID { get; init; }
    public string LedgerType { get; init; } = string.Empty;
}

public sealed class LedgerHeadMasterDto
{
    public long LedgerHeadID { get; init; }
    public long UnderOrgID { get; init; }
    public long SrNo { get; init; }
    public string LedgerHead { get; init; } = string.Empty;
    public string? LedgerHeadShort { get; init; }
    public long LedgerTypeID { get; init; }
    public string? LedgerType { get; init; }
    public bool IsActive { get; init; }
}

public sealed class SaveLedgerHeadRequestDto
{
    public long? LedgerHeadID { get; init; }
    public long UnderOrgID { get; init; }
    public string LedgerHead { get; init; } = string.Empty;
    public string? LedgerHeadShort { get; init; }
    public long LedgerTypeID { get; init; }
    public bool IsActive { get; init; } = true;
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

public sealed class AuditDashboardSummaryDto
{
    public long? FyID { get; init; }
    public string FyName { get; init; } = string.Empty;
    public int ReceiptVoucherCount { get; init; }
    public decimal ReceiptVoucherAmount { get; init; }
    public int PaymentVoucherCount { get; init; }
    public decimal PaymentVoucherAmount { get; init; }
    public int DonationCount { get; init; }
    public decimal DonationAmount { get; init; }
}

public sealed class AuditDashboardResponseDto
{
    public AuditDashboardSummaryDto Summary { get; init; } = new();
    public IReadOnlyList<AuditDashboardRowDto> Rows { get; init; } = [];
}

public sealed class AuditLookupsDto
{
    public IReadOnlyList<OrgOptionDto> Orgs { get; init; } = [];
    public IReadOnlyList<OrgOptionDto> SansthaOrgs { get; init; } = [];
    public IReadOnlyList<PaymentTypeOptionDto> PaymentTypes { get; init; } = [];
    public IReadOnlyList<FyOptionDto> FyList { get; init; } = [];
    public IReadOnlyList<LedgerHeadOptionDto> LedgerHeads { get; init; } = [];
    public IReadOnlyList<LedgerHeadOptionDto> BankLedgerHeads { get; init; } = [];
}
