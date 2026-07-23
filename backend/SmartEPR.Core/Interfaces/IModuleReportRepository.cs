using SmartEPR.Core.DTOs.Reports;

namespace SmartEPR.Core.Interfaces;

public interface IModuleReportRepository
{
    Task<(ModuleReportHeaderDto? Header, IReadOnlyList<VoucherLedgerLineDto> Lines)> GetVoucherLedgerAsync(
        ModuleReportFilterDto filter,
        CancellationToken cancellationToken = default);

    Task<(ModuleReportHeaderDto? Header, IReadOnlyList<TrialBalanceLineDto> Lines)> GetTrialBalanceAsync(
        long orgId,
        CancellationToken cancellationToken = default);

    Task<(ModuleReportHeaderDto? Header, IReadOnlyList<SchoolDetailsLineDto> Lines)> GetSchoolDetailsAsync(
        long sansthaId,
        CancellationToken cancellationToken = default);

    Task<(ModuleReportHeaderDto? Header, IReadOnlyList<UserDetailLineDto> Lines)> GetUserDetailAsync(
        ModuleReportFilterDto filter,
        string reportMode,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InwardRegisterLineDto>> GetInwardRegisterAsync(
        ModuleReportFilterDto filter,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OutwardRegisterLineDto>> GetOutwardRegisterAsync(
        ModuleReportFilterDto filter,
        CancellationToken cancellationToken = default);

    Task<(ModuleReportHeaderDto? Header, IReadOnlyList<StockRegisterLineDto> Lines)> GetStockRegisterAsync(
        ModuleReportFilterDto filter,
        CancellationToken cancellationToken = default);
}
