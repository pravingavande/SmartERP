using SmartEPR.Core.DTOs.Audit;

namespace SmartEPR.Core.Interfaces;

public interface IAuditVoucherRepository
{
    Task<IReadOnlyList<OrgOptionDto>> GetUserOrgsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrgOptionDto>> GetSansthaOrgsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterOptionDto>> GetAccountRegistersAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PartyOptionDto>> GetPartiesAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PaymentTypeOptionDto>> GetPaymentTypesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FyOptionDto>> GetFyListAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LedgerHeadOptionDto>> GetLedgerHeadsAsync(long? orgId = null, string? vType = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LedgerHeadOptionDto>> GetBankLedgerHeadsAsync(long? orgId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetLedgerNarrationsAsync(long orgId, long ledgerHeadId, string? search = null, CancellationToken cancellationToken = default);
    Task SaveLedgerNarrationAsync(long orgId, long ledgerHeadId, string narration, CancellationToken cancellationToken = default);
    Task<long> GetNextVCodeAsync(long orgId, long accountRegisterId, long fyId, string vType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<VoucherListItemDto>> GetVoucherListAsync(long orgId, string vType, long? fyId, CancellationToken cancellationToken = default);
    Task<VoucherDto?> GetVoucherByIdAsync(long voucherId, CancellationToken cancellationToken = default);
    Task<long> SaveVoucherAsync(long userId, SaveVoucherRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteVoucherAsync(long voucherId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuditDashboardRowDto>> GetDashboardAsync(long userId, CancellationToken cancellationToken = default);
    Task<AuditDashboardSummaryDto> GetDashboardSummaryAsync(long userId, long? fyId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<AuditCashSummaryVoucherRowDto> VoucherRows, IReadOnlyList<AuditCashSummaryAvailableRowDto> AvailableCashRows)> GetCashSummaryAsync(
        long userId,
        long? fyId,
        long? orgId,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterMasterOptionDto>> GetAccountRegisterMasterAsync(long? underOrgId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterMasterDto>> GetAccountRegisterListAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<AccountRegisterMasterDto?> GetAccountRegisterByIdAsync(long accountRegisterId, CancellationToken cancellationToken = default);
    Task<long> GetNextAccountRegisterSrNoAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<long> SaveAccountRegisterAsync(SaveAccountRegisterMasterRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteAccountRegisterAsync(long accountRegisterId, CancellationToken cancellationToken = default);
    Task<ImportAccountRegisterResultDto> ImportAccountRegistersAsync(long destinationUnderOrgId, IReadOnlyList<long> accountRegisterIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterMasterOptionDto>> GetAccountRegisterDefineByOrgAsync(long orgId, CancellationToken cancellationToken = default);
    Task SaveAccountRegisterDefineAsync(long orgId, IReadOnlyList<long> accountRegisterIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PartyMasterDto>> GetPartyListAsync(long orgId, CancellationToken cancellationToken = default);
    Task<PartyMasterDto?> GetPartyByIdAsync(long partyId, CancellationToken cancellationToken = default);
    Task<long> SavePartyAsync(SavePartyRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LedgerTypeOptionDto>> GetLedgerTypesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LedgerHeadMasterDto>> GetLedgerHeadListAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<LedgerHeadMasterDto?> GetLedgerHeadByIdAsync(long ledgerHeadId, CancellationToken cancellationToken = default);
    Task<long> GetNextLedgerHeadSrNoAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<long> SaveLedgerHeadAsync(SaveLedgerHeadRequestDto request, CancellationToken cancellationToken = default);
    Task<ImportLedgerHeadResultDto> ImportLedgerHeadsAsync(long destinationUnderOrgId, IReadOnlyList<long> ledgerHeadIds, CancellationToken cancellationToken = default);
}

public interface IAuditVoucherService
{
    Task<AuditLookupsDto> GetLookupsAsync(long userId, long? orgId = null, string? vType = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrgOptionDto>> GetSansthaOrgsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterOptionDto>> GetAccountRegistersAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PartyOptionDto>> GetPartiesAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetLedgerNarrationsAsync(long orgId, long ledgerHeadId, string? search = null, CancellationToken cancellationToken = default);
    Task<long> GetNextVCodeAsync(long orgId, long accountRegisterId, long fyId, string vType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<VoucherListItemDto>> GetVoucherListAsync(long userId, long orgId, string vType, long? fyId, CancellationToken cancellationToken = default);
    Task<VoucherDto?> GetVoucherByIdAsync(long voucherId, CancellationToken cancellationToken = default);
    Task<VoucherDto?> SaveVoucherAsync(long userId, SaveVoucherRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteVoucherAsync(long voucherId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuditDashboardRowDto>> GetDashboardAsync(long userId, CancellationToken cancellationToken = default);
    Task<AuditDashboardSummaryDto> GetDashboardSummaryAsync(long userId, long? fyId, CancellationToken cancellationToken = default);
    Task<AuditDashboardResponseDto> GetDashboardPageAsync(long userId, long? fyId, CancellationToken cancellationToken = default);
    Task<AuditCashSummaryResponseDto> GetCashSummaryAsync(long userId, long? fyId, long? orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterMasterOptionDto>> GetAccountRegisterMasterAsync(long? underOrgId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountRegisterMasterDto>> GetAccountRegisterListAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<AccountRegisterMasterDto?> GetAccountRegisterByIdAsync(long accountRegisterId, CancellationToken cancellationToken = default);
    Task<long> GetNextAccountRegisterSrNoAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<(AccountRegisterMasterDto? Data, string? Error)> SaveAccountRegisterAsync(SaveAccountRegisterMasterRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteAccountRegisterAsync(long accountRegisterId, CancellationToken cancellationToken = default);
    Task<(ImportAccountRegisterResultDto? Data, string? Error)> ImportAccountRegistersAsync(ImportAccountRegisterRequestDto request, CancellationToken cancellationToken = default);
    Task<AccountRegisterDefineDto> GetAccountRegisterDefineAsync(long orgId, CancellationToken cancellationToken = default);
    Task SaveAccountRegisterDefineAsync(SaveAccountRegisterDefineRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PartyMasterDto>> GetPartyListAsync(long orgId, CancellationToken cancellationToken = default);
    Task<PartyMasterDto?> GetPartyByIdAsync(long partyId, CancellationToken cancellationToken = default);
    Task<PartyMasterDto?> SavePartyAsync(SavePartyRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LedgerTypeOptionDto>> GetLedgerTypesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LedgerHeadMasterDto>> GetLedgerHeadListAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<LedgerHeadMasterDto?> GetLedgerHeadByIdAsync(long ledgerHeadId, CancellationToken cancellationToken = default);
    Task<long> GetNextLedgerHeadSrNoAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<LedgerHeadMasterDto?> SaveLedgerHeadAsync(SaveLedgerHeadRequestDto request, CancellationToken cancellationToken = default);
    Task<(ImportLedgerHeadResultDto? Data, string? Error)> ImportLedgerHeadsAsync(ImportLedgerHeadRequestDto request, CancellationToken cancellationToken = default);
}
