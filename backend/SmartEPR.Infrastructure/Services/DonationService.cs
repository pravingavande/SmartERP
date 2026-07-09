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
        var bankLedgerHeads = await _auditRepository.GetBankLedgerHeadsAsync(cancellationToken).ConfigureAwait(false);

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

    public Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadMasterAsync(CancellationToken cancellationToken = default)
        => _donationRepository.GetDRHeadMasterAsync(cancellationToken);

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
