using SmartEPR.Core.DTOs.Reports;

namespace SmartEPR.Core.Interfaces;

public interface IModuleReportService
{
    Task<byte[]?> RenderVoucherLedgerPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderTrialBalancePdfAsync(long orgId, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderSchoolDetailsPdfAsync(long sansthaId, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderEmployeePdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderEmployeeSeniorityPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderRetiredEmployeePdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderInwardRegisterPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderOutwardRegisterPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default);
    Task<byte[]?> RenderStockRegisterPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default);
}
