using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Donation;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class DonationService : IDonationService
{
    private readonly IDonationRepository _donationRepository;
    private readonly IAuditVoucherRepository _auditRepository;

    public DonationService(IDonationRepository donationRepository, IAuditVoucherRepository auditRepository)
    {
        _donationRepository = donationRepository;
        _auditRepository = auditRepository;
    }

    public async Task<DonationLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var orgs = await _auditRepository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        var drHeads = await _donationRepository.GetDRHeadsAsync(null, cancellationToken).ConfigureAwait(false);
        var paymentTypes = await _auditRepository.GetPaymentTypesAsync(cancellationToken).ConfigureAwait(false);
        var fyList = await _auditRepository.GetFyListAsync(cancellationToken).ConfigureAwait(false);
        var bankLedgerHeads = await _auditRepository.GetBankLedgerHeadsAsync(orgId: null, cancellationToken).ConfigureAwait(false);

        return new DonationLookupsDto
        {
            Orgs = orgs,
            DrHeads = drHeads,
            PaymentTypes = paymentTypes,
            FyList = fyList,
            BankLedgerHeads = bankLedgerHeads
        };
    }

    public Task<long> GetNextReceiptNoAsync(long fyId, CancellationToken cancellationToken = default)
        => _donationRepository.GetNextReceiptNoAsync(fyId, cancellationToken);

    public Task<long> GetNextOrgReceiptNoAsync(long orgId, long fyId, CancellationToken cancellationToken = default)
        => _donationRepository.GetNextOrgReceiptNoAsync(orgId, fyId, cancellationToken);

    public Task<IReadOnlyList<DonationListItemDto>> GetListAsync(long? orgId, long? fyId, CancellationToken cancellationToken = default)
        => _donationRepository.GetListAsync(orgId, fyId, cancellationToken);

    public Task<DonationListItemDto?> GetByIdAsync(long drId, CancellationToken cancellationToken = default)
        => _donationRepository.GetByIdAsync(drId, cancellationToken);

    public async Task<DonationListItemDto?> SaveAsync(long userId, SaveDonationRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.DonorName) || request.Amount <= 0)
            return null;

        var drId = await _donationRepository.SaveAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return await _donationRepository.GetByIdAsync(drId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> DeleteAsync(long drId, CancellationToken cancellationToken = default)
    {
        await _donationRepository.DeleteAsync(drId, cancellationToken).ConfigureAwait(false);
        return true;
    }

    public Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadMasterAsync(long? underOrgId = null, CancellationToken cancellationToken = default)
        => _donationRepository.GetDRHeadMasterAsync(underOrgId, cancellationToken);

    public Task<IReadOnlyList<DRHeadMasterDto>> GetDRHeadListAsync(long underOrgId, CancellationToken cancellationToken = default)
        => _donationRepository.GetDRHeadListAsync(underOrgId, cancellationToken);

    public Task<DRHeadMasterDto?> GetDRHeadByIdAsync(long drHeadId, CancellationToken cancellationToken = default)
        => _donationRepository.GetDRHeadByIdAsync(drHeadId, cancellationToken);

    public Task<long> GetNextDRHeadSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
        => _donationRepository.GetNextDRHeadSrNoAsync(underOrgId, cancellationToken);

    public async Task<(DRHeadMasterDto? Data, string? Error)> SaveDRHeadAsync(
        SaveDRHeadMasterRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var name = (request.DRHeadName ?? string.Empty).Trim();
        if (request.UnderOrgID <= 0)
            return (null, "Organization is required.");
        if (request.SrNo <= 0)
            return (null, "Sr No is required.");
        if (string.IsNullOrWhiteSpace(name))
            return (null, "Donation head is required.");

        var saveRequest = new SaveDRHeadMasterRequestDto
        {
            DRHeadID = request.DRHeadID,
            UnderOrgID = request.UnderOrgID,
            SrNo = request.SrNo,
            DRHeadName = name,
            IsActive = request.IsActive
        };

        try
        {
            var id = await _donationRepository.SaveDRHeadAsync(saveRequest, cancellationToken).ConfigureAwait(false);
            var saved = await _donationRepository.GetDRHeadByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null
                ? (null, "Unable to save donation head.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteDRHeadAsync(long drHeadId, CancellationToken cancellationToken = default)
    {
        if (drHeadId <= 0)
            return (false, "Donation head is required.");

        try
        {
            await _donationRepository.DeleteDRHeadAsync(drHeadId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public async Task<(ImportDRHeadResultDto? Data, string? Error)> ImportDRHeadsAsync(
        ImportDRHeadRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.DestinationUnderOrgID <= 0)
            return (null, "Organization is required.");
        if (request.DestinationUnderOrgID == 1)
            return (null, "Cannot import into the source organization.");
        if (request.DRHeadIds is null || request.DRHeadIds.Count == 0)
            return (null, "Select at least one donation head to import.");

        try
        {
            var result = await _donationRepository.ImportDRHeadsAsync(
                request.DestinationUnderOrgID,
                request.DRHeadIds,
                cancellationToken).ConfigureAwait(false);
            return (result, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<DRHeadDefineDto> GetDRHeadDefineAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var mapped = await _donationRepository.GetDRHeadDefineByOrgAsync(orgId, cancellationToken).ConfigureAwait(false);
        return new DRHeadDefineDto
        {
            OrgID = orgId,
            DRHeadIds = mapped.Select(h => h.DRHeadID).ToList()
        };
    }

    public Task SaveDRHeadDefineAsync(SaveDRHeadDefineRequestDto request, CancellationToken cancellationToken = default)
        => _donationRepository.SaveDRHeadDefineAsync(request.OrgID, request.DRHeadIds, cancellationToken);

    public Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadsForOrgAsync(long orgId, CancellationToken cancellationToken = default)
        => _donationRepository.GetDRHeadsAsync(orgId, cancellationToken);
}
