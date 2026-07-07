using SmartEPR.Core.DTOs.Audit;

namespace SmartEPR.Core.Interfaces;

public interface IAuditVoucherRepository
{
    Task<IReadOnlyList<OrgOptionDto>> GetUserOrgsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterOptionDto>> GetAccountRegistersAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PartyOptionDto>> GetPartiesAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PaymentTypeOptionDto>> GetPaymentTypesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FyOptionDto>> GetFyListAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LedgerHeadOptionDto>> GetLedgerHeadsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LedgerHeadOptionDto>> GetBankLedgerHeadsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetLedgerNarrationsAsync(long ledgerHeadId, CancellationToken cancellationToken = default);
    Task SaveLedgerNarrationAsync(long ledgerHeadId, string narration, CancellationToken cancellationToken = default);
    Task<long> GetNextVCodeAsync(long orgId, long accountRegisterId, long fyId, string vType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<VoucherListItemDto>> GetVoucherListAsync(long orgId, string vType, long? fyId, CancellationToken cancellationToken = default);
    Task<VoucherDto?> GetVoucherByIdAsync(long voucherId, CancellationToken cancellationToken = default);
    Task<long> SaveVoucherAsync(long userId, SaveVoucherRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteVoucherAsync(long voucherId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuditDashboardRowDto>> GetDashboardAsync(long userId, CancellationToken cancellationToken = default);
}

public interface IAuditVoucherService
{
    Task<AuditLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterOptionDto>> GetAccountRegistersAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PartyOptionDto>> GetPartiesAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetLedgerNarrationsAsync(long ledgerHeadId, CancellationToken cancellationToken = default);
    Task<long> GetNextVCodeAsync(long orgId, long accountRegisterId, long fyId, string vType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<VoucherListItemDto>> GetVoucherListAsync(long userId, long orgId, string vType, long? fyId, CancellationToken cancellationToken = default);
    Task<VoucherDto?> GetVoucherByIdAsync(long voucherId, CancellationToken cancellationToken = default);
    Task<VoucherDto?> SaveVoucherAsync(long userId, SaveVoucherRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteVoucherAsync(long voucherId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuditDashboardRowDto>> GetDashboardAsync(long userId, CancellationToken cancellationToken = default);
}
