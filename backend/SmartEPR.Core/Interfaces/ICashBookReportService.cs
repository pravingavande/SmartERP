using SmartEPR.Core.DTOs.Reports;

namespace SmartEPR.Core.Interfaces;

public interface ICashBookReportService
{
    Task<byte[]?> RenderCashBookPdfAsync(CashBookReportFilterDto filter, CancellationToken cancellationToken = default);
}
