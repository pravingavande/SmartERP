using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Interfaces;
using SmartEPR.Core.Validation;

namespace SmartEPR.Infrastructure.Services;

public sealed class AuditVoucherService : IAuditVoucherService
{
    private readonly IAuditVoucherRepository _repository;

    public AuditVoucherService(IAuditVoucherRepository repository)
    {
        _repository = repository;
    }

    public async Task<AuditLookupsDto> GetLookupsAsync(long userId, long? orgId = null, string? vType = null, CancellationToken cancellationToken = default)
    {
        var orgs = await _repository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        var sansthaOrgs = await _repository.GetSansthaOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        var paymentTypes = await _repository.GetPaymentTypesAsync(cancellationToken).ConfigureAwait(false);
        var fyList = await _repository.GetFyListAsync(cancellationToken).ConfigureAwait(false);

        var normalizedVType = (vType ?? string.Empty).Trim().ToUpperInvariant();
        var isBankVoucher = normalizedVType is "BD" or "BW";
        var ledgerVType = isBankVoucher ? null : (string.IsNullOrEmpty(normalizedVType) ? null : normalizedVType);

        var ledgerHeads = isBankVoucher
            ? Array.Empty<LedgerHeadOptionDto>()
            : await _repository.GetLedgerHeadsAsync(orgId, ledgerVType, cancellationToken).ConfigureAwait(false);
        var bankLedgerHeads = await _repository.GetBankLedgerHeadsAsync(orgId, cancellationToken).ConfigureAwait(false);

        return new AuditLookupsDto
        {
            Orgs = orgs,
            SansthaOrgs = sansthaOrgs,
            PaymentTypes = paymentTypes,
            FyList = fyList,
            LedgerHeads = ledgerHeads,
            BankLedgerHeads = bankLedgerHeads
        };
    }

    public Task<IReadOnlyList<OrgOptionDto>> GetSansthaOrgsAsync(long userId, CancellationToken cancellationToken = default)
        => _repository.GetSansthaOrgsAsync(userId, cancellationToken);

    public Task<IReadOnlyList<AccountRegisterOptionDto>> GetAccountRegistersAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetAccountRegistersAsync(orgId, cancellationToken);

    public Task<IReadOnlyList<PartyOptionDto>> GetPartiesAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetPartiesAsync(orgId, cancellationToken);

    public Task<IReadOnlyList<string>> GetLedgerNarrationsAsync(long orgId, long ledgerHeadId, string? search = null, CancellationToken cancellationToken = default)
        => _repository.GetLedgerNarrationsAsync(orgId, ledgerHeadId, search, cancellationToken);

    public Task<long> GetNextVCodeAsync(long orgId, long accountRegisterId, long fyId, string vType, CancellationToken cancellationToken = default)
        => _repository.GetNextVCodeAsync(orgId, accountRegisterId, fyId, vType, cancellationToken);

    public Task<IReadOnlyList<VoucherListItemDto>> GetVoucherListAsync(long userId, long orgId, string vType, long? fyId, CancellationToken cancellationToken = default)
        => _repository.GetVoucherListAsync(orgId, vType, fyId, cancellationToken);

    public Task<VoucherDto?> GetVoucherByIdAsync(long voucherId, CancellationToken cancellationToken = default)
        => _repository.GetVoucherByIdAsync(voucherId, cancellationToken);

    public async Task<VoucherDto?> SaveVoucherAsync(long userId, SaveVoucherRequestDto request, CancellationToken cancellationToken = default)
    {
        if (AuditVoucherRules.ValidateSaveOrUpdate(request) is not null)
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

    public Task<AuditDashboardSummaryDto> GetDashboardSummaryAsync(long userId, long? fyId, CancellationToken cancellationToken = default)
        => _repository.GetDashboardSummaryAsync(userId, fyId, cancellationToken);

    public async Task<AuditDashboardResponseDto> GetDashboardPageAsync(long userId, long? fyId, CancellationToken cancellationToken = default)
    {
        var rowsTask = _repository.GetDashboardAsync(userId, cancellationToken);
        var summaryTask = _repository.GetDashboardSummaryAsync(userId, fyId, cancellationToken);
        await Task.WhenAll(rowsTask, summaryTask).ConfigureAwait(false);
        return new AuditDashboardResponseDto
        {
            Rows = await rowsTask.ConfigureAwait(false),
            Summary = await summaryTask.ConfigureAwait(false)
        };
    }

    public async Task<AuditCashSummaryResponseDto> GetCashSummaryAsync(long userId, long? fyId, long? orgId, CancellationToken cancellationToken = default)
    {
        var (voucherRows, availableCashRows) = await _repository
            .GetCashSummaryAsync(userId, fyId, orgId, cancellationToken)
            .ConfigureAwait(false);
        return new AuditCashSummaryResponseDto
        {
            VoucherRows = voucherRows,
            AvailableCashRows = availableCashRows
        };
    }

    public Task<IReadOnlyList<AccountRegisterMasterOptionDto>> GetAccountRegisterMasterAsync(long? underOrgId = null, CancellationToken cancellationToken = default)
        => _repository.GetAccountRegisterMasterAsync(underOrgId, cancellationToken);

    public Task<IReadOnlyList<AccountRegisterMasterDto>> GetAccountRegisterListAsync(long underOrgId, CancellationToken cancellationToken = default)
        => _repository.GetAccountRegisterListAsync(underOrgId, cancellationToken);

    public Task<AccountRegisterMasterDto?> GetAccountRegisterByIdAsync(long accountRegisterId, CancellationToken cancellationToken = default)
        => _repository.GetAccountRegisterByIdAsync(accountRegisterId, cancellationToken);

    public Task<long> GetNextAccountRegisterSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
        => _repository.GetNextAccountRegisterSrNoAsync(underOrgId, cancellationToken);

    public async Task<(AccountRegisterMasterDto? Data, string? Error)> SaveAccountRegisterAsync(
        SaveAccountRegisterMasterRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var name = (request.AccountRegister ?? string.Empty).Trim();
        if (request.UnderOrgID <= 0)
            return (null, "Organization is required.");
        if (request.SrNo <= 0)
            return (null, "Sr No is required.");
        if (string.IsNullOrWhiteSpace(name))
            return (null, "Account register is required.");

        var saveRequest = new SaveAccountRegisterMasterRequestDto
        {
            AccountRegisterID = request.AccountRegisterID,
            UnderOrgID = request.UnderOrgID,
            SrNo = request.SrNo,
            AccountRegister = name,
            IsActive = request.IsActive
        };

        try
        {
            var id = await _repository.SaveAccountRegisterAsync(saveRequest, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetAccountRegisterByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null
                ? (null, "Unable to save account register.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteAccountRegisterAsync(long accountRegisterId, CancellationToken cancellationToken = default)
    {
        if (accountRegisterId <= 0)
            return (false, "Account register is required.");

        try
        {
            await _repository.DeleteAccountRegisterAsync(accountRegisterId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public async Task<(ImportAccountRegisterResultDto? Data, string? Error)> ImportAccountRegistersAsync(
        ImportAccountRegisterRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.DestinationUnderOrgID <= 0)
            return (null, "Organization is required.");
        if (request.DestinationUnderOrgID == 1)
            return (null, "Cannot import into the source organization.");
        if (request.AccountRegisterIds is null || request.AccountRegisterIds.Count == 0)
            return (null, "Select at least one account register to import.");

        try
        {
            var result = await _repository.ImportAccountRegistersAsync(
                request.DestinationUnderOrgID,
                request.AccountRegisterIds,
                cancellationToken).ConfigureAwait(false);
            return (result, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

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

    public Task<IReadOnlyList<LedgerTypeOptionDto>> GetLedgerTypesAsync(CancellationToken cancellationToken = default)
        => _repository.GetLedgerTypesAsync(cancellationToken);

    public Task<IReadOnlyList<LedgerHeadMasterDto>> GetLedgerHeadListAsync(long underOrgId, CancellationToken cancellationToken = default)
        => _repository.GetLedgerHeadListAsync(underOrgId, cancellationToken);

    public Task<LedgerHeadMasterDto?> GetLedgerHeadByIdAsync(long ledgerHeadId, CancellationToken cancellationToken = default)
        => _repository.GetLedgerHeadByIdAsync(ledgerHeadId, cancellationToken);

    public Task<long> GetNextLedgerHeadSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
        => _repository.GetNextLedgerHeadSrNoAsync(underOrgId, cancellationToken);

    public async Task<LedgerHeadMasterDto?> SaveLedgerHeadAsync(SaveLedgerHeadRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request.UnderOrgID <= 0 || string.IsNullOrWhiteSpace(request.LedgerHead) || request.LedgerTypeID <= 0)
            return null;

        var normalized = new SaveLedgerHeadRequestDto
        {
            LedgerHeadID = request.LedgerHeadID,
            UnderOrgID = request.UnderOrgID,
            OrgID = request.OrgID is > 0 ? request.OrgID : request.UnderOrgID,
            LedgerHead = request.LedgerHead.Trim(),
            LedgerHeadEng = string.IsNullOrWhiteSpace(request.LedgerHeadEng) ? null : request.LedgerHeadEng.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            LedgerTypeID = request.LedgerTypeID,
            IsActive = request.IsActive
        };

        var ledgerHeadId = await _repository.SaveLedgerHeadAsync(normalized, cancellationToken).ConfigureAwait(false);
        return await _repository.GetLedgerHeadByIdAsync(ledgerHeadId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<(ImportLedgerHeadResultDto? Data, string? Error)> ImportLedgerHeadsAsync(
        ImportLedgerHeadRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.DestinationUnderOrgID <= 0)
            return (null, "Organization is required.");
        if (request.DestinationUnderOrgID == 1)
            return (null, "Cannot import into the source organization.");
        if (request.LedgerHeadIds is null || request.LedgerHeadIds.Count == 0)
            return (null, "Select at least one ledger head to import.");

        try
        {
            var result = await _repository.ImportLedgerHeadsAsync(
                request.DestinationUnderOrgID,
                request.LedgerHeadIds,
                cancellationToken).ConfigureAwait(false);
            return (result, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }
}
