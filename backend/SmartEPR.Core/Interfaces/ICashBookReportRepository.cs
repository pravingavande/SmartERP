using SmartEPR.Core.DTOs.Reports;

namespace SmartEPR.Core.Interfaces;

public interface ICashBookReportRepository
{
    Task<(CashBookHeaderDto? Header, IReadOnlyList<CashBookLineDto> Lines)> GetReportAsync(
        CashBookReportFilterDto filter,
        CancellationToken cancellationToken = default);
}
