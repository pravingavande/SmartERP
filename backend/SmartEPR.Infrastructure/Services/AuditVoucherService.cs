using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class AuditVoucherService : IAuditVoucherService
{
    private readonly IAuditVoucherRepository _repository;

    public AuditVoucherService(IAuditVoucherRepository repository)
    {
        _repository = repository;
    }

    public async Task<AuditLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var orgs = await _repository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        var paymentTypes = await _repository.GetPaymentTypesAsync(cancellationToken).ConfigureAwait(false);
        var fyList = await _repository.GetFyListAsync(cancellationToken).ConfigureAwait(false);
        var ledgerHeads = await _repository.GetLedgerHeadsAsync(cancellationToken).ConfigureAwait(false);
        var bankLedgerHeads = await _repository.GetBankLedgerHeadsAsync(cancellationToken).ConfigureAwait(false);

        return new AuditLookupsDto
        {
            Orgs = orgs,
            PaymentTypes = paymentTypes,
            FyList = fyList,
            LedgerHeads = ledgerHeads,
            BankLedgerHeads = bankLedgerHeads
        };
    }

    public Task<IReadOnlyList<AccountRegisterOptionDto>> GetAccountRegistersAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetAccountRegistersAsync(orgId, cancellationToken);

    public Task<IReadOnlyList<PartyOptionDto>> GetPartiesAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetPartiesAsync(orgId, cancellationToken);

    public Task<IReadOnlyList<string>> GetLedgerNarrationsAsync(long ledgerHeadId, CancellationToken cancellationToken = default)
        => _repository.GetLedgerNarrationsAsync(ledgerHeadId, cancellationToken);

    public Task<long> GetNextVCodeAsync(long orgId, long accountRegisterId, long fyId, string vType, CancellationToken cancellationToken = default)
        => _repository.GetNextVCodeAsync(orgId, accountRegisterId, fyId, vType, cancellationToken);

    public Task<IReadOnlyList<VoucherListItemDto>> GetVoucherListAsync(long userId, long orgId, string vType, long? fyId, CancellationToken cancellationToken = default)
        => _repository.GetVoucherListAsync(orgId, vType, fyId, cancellationToken);

    public Task<VoucherDto?> GetVoucherByIdAsync(long voucherId, CancellationToken cancellationToken = default)
        => _repository.GetVoucherByIdAsync(voucherId, cancellationToken);

    public async Task<VoucherDto?> SaveVoucherAsync(long userId, SaveVoucherRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request.Details.Count == 0)
            return null;

        if (request.Details.Sum(d => d.Amount) <= 0)
            return null;

        var voucherId = await _repository.SaveVoucherAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return await _repository.GetVoucherByIdAsync(voucherId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> DeleteVoucherAsync(long voucherId, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteVoucherAsync(voucherId, cancellationToken).ConfigureAwait(false);
        return true;
    }

    public Task<IReadOnlyList<AuditDashboardRowDto>> GetDashboardAsync(long userId, CancellationToken cancellationToken = default)
        => _repository.GetDashboardAsync(userId, cancellationToken);

    public Task<IReadOnlyList<AccountRegisterMasterOptionDto>> GetAccountRegisterMasterAsync(CancellationToken cancellationToken = default)
        => _repository.GetAccountRegisterMasterAsync(cancellationToken);

    public async Task<AccountRegisterDefineDto> GetAccountRegisterDefineAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var mapped = await _repository.GetAccountRegisterDefineByOrgAsync(orgId, cancellationToken).ConfigureAwait(false);
        return new AccountRegisterDefineDto
        {
            OrgID = orgId,
            AccountRegisterIds = mapped.Select(m => m.AccountRegisterID).ToList()
        };
    }

    public Task SaveAccountRegisterDefineAsync(SaveAccountRegisterDefineRequestDto request, CancellationToken cancellationToken = default)
        => _repository.SaveAccountRegisterDefineAsync(request.OrgID, request.AccountRegisterIds, cancellationToken);

    public Task<IReadOnlyList<PartyMasterDto>> GetPartyListAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetPartyListAsync(orgId, cancellationToken);

    public Task<PartyMasterDto?> GetPartyByIdAsync(long partyId, CancellationToken cancellationToken = default)
        => _repository.GetPartyByIdAsync(partyId, cancellationToken);

    public async Task<PartyMasterDto?> SavePartyAsync(SavePartyRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.PartyName))
            return null;

        var partyId = await _repository.SavePartyAsync(request, cancellationToken).ConfigureAwait(false);
        return await _repository.GetPartyByIdAsync(partyId, cancellationToken).ConfigureAwait(false);
    }
}
