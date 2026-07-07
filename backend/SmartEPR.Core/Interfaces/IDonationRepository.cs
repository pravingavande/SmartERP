using SmartEPR.Core.DTOs.Donation;

namespace SmartEPR.Core.Interfaces;

public interface IDonationRepository
{
    Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadsAsync(CancellationToken cancellationToken = default);
    Task<long> GetNextReceiptNoAsync(long fyId, CancellationToken cancellationToken = default);
    Task<long> GetNextOrgReceiptNoAsync(long orgId, long fyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationListItemDto>> GetListAsync(long? orgId, long? fyId, CancellationToken cancellationToken = default);
    Task<DonationListItemDto?> GetByIdAsync(long drId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(long userId, SaveDonationRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long drId, CancellationToken cancellationToken = default);
}

public interface IDonationService
{
    Task<DonationLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<long> GetNextReceiptNoAsync(long fyId, CancellationToken cancellationToken = default);
    Task<long> GetNextOrgReceiptNoAsync(long orgId, long fyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationListItemDto>> GetListAsync(long? orgId, long? fyId, CancellationToken cancellationToken = default);
    Task<DonationListItemDto?> GetByIdAsync(long drId, CancellationToken cancellationToken = default);
    Task<DonationListItemDto?> SaveAsync(long userId, SaveDonationRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long drId, CancellationToken cancellationToken = default);
}
