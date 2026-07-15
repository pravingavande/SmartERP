namespace SmartEPR.Core.Interfaces;

using SmartEPR.Core.DTOs.Reports;

public interface IDonationReportService
{
    Task<byte[]?> RenderDonationReceiptPdfAsync(long drId, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderDonationDetailReportPdfAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderDonationSchoolWiseDetailReportPdfAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderDonationUserWiseDetailReportPdfAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default);
}
