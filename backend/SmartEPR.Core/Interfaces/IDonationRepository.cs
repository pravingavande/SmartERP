using SmartEPR.Core.DTOs.Donation;
using SmartEPR.Core.DTOs.Reports;

namespace SmartEPR.Core.Interfaces;

public interface IDonationRepository
{
    Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadsAsync(long? orgId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadMasterAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadDefineByOrgAsync(long orgId, CancellationToken cancellationToken = default);
    Task SaveDRHeadDefineAsync(long orgId, IReadOnlyList<long> drHeadIds, CancellationToken cancellationToken = default);
    Task<long> GetNextReceiptNoAsync(long fyId, CancellationToken cancellationToken = default);
    Task<long> GetNextOrgReceiptNoAsync(long orgId, long fyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationListItemDto>> GetListAsync(long? orgId, long? fyId, CancellationToken cancellationToken = default);
    Task<DonationListItemDto?> GetByIdAsync(long drId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(long userId, SaveDonationRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long drId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationReportDetailRowDto>> GetReportDetailAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationReportUserSummaryRowDto>> GetReportUserSummaryAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default);
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
    Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadMasterAsync(CancellationToken cancellationToken = default);
    Task<DRHeadDefineDto> GetDRHeadDefineAsync(long orgId, CancellationToken cancellationToken = default);
    Task SaveDRHeadDefineAsync(SaveDRHeadDefineRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadsForOrgAsync(long orgId, CancellationToken cancellationToken = default);
}
