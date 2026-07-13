namespace SmartEPR.Core.Interfaces;

public interface IDonationReportService
{
    Task<byte[]?> RenderDonationReceiptPdfAsync(long drId, CancellationToken cancellationToken = default);
}
