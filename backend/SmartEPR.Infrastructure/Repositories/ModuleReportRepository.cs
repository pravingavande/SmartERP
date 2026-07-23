using System.Data;
using Dapper;
using SmartEPR.Core.DTOs.Reports;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class ModuleReportRepository : IModuleReportRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public ModuleReportRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<(ModuleReportHeaderDto? Header, IReadOnlyList<VoucherLedgerLineDto> Lines)> GetVoucherLedgerAsync(
        ModuleReportFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@LedgerHeadID", filter.AllLedgerHeads ? null : filter.LedgerHeadID);
        p.Add("@AllLedgerHeads", filter.AllLedgerHeads);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_VoucherLedger_GetReport",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var header = await multi.ReadFirstOrDefaultAsync<ModuleReportHeaderDto>().ConfigureAwait(false);
        var lines = (await multi.ReadAsync<VoucherLedgerLineDto>().ConfigureAwait(false)).AsList();
        return (header, lines);
    }

    public async Task<(ModuleReportHeaderDto? Header, IReadOnlyList<TrialBalanceLineDto> Lines)> GetTrialBalanceAsync(
        long orgId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_TrialBalance_GetReport",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var header = await multi.ReadFirstOrDefaultAsync<ModuleReportHeaderDto>().ConfigureAwait(false);
        var lines = (await multi.ReadAsync<TrialBalanceLineDto>().ConfigureAwait(false)).AsList();
        return (header, lines);
    }

    public async Task<(ModuleReportHeaderDto? Header, IReadOnlyList<SchoolDetailsLineDto> Lines)> GetSchoolDetailsAsync(
        long sansthaId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@SansthaID", sansthaId);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_SchoolDetails_GetReport",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var header = await multi.ReadFirstOrDefaultAsync<ModuleReportHeaderDto>().ConfigureAwait(false);
        var lines = (await multi.ReadAsync<SchoolDetailsLineDto>().ConfigureAwait(false)).AsList();
        return (header, lines);
    }

    public async Task<(ModuleReportHeaderDto? Header, IReadOnlyList<UserDetailLineDto> Lines)> GetUserDetailAsync(
        ModuleReportFilterDto filter,
        string reportMode,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@SansthaID", filter.SansthaID);
        p.Add("@ReportMode", reportMode);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_UserDetail_GetReport",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var header = await multi.ReadFirstOrDefaultAsync<ModuleReportHeaderDto>().ConfigureAwait(false);
        var lines = (await multi.ReadAsync<UserDetailLineDto>().ConfigureAwait(false)).AsList();
        return (header, lines);
    }

    public async Task<IReadOnlyList<InwardRegisterLineDto>> GetInwardRegisterAsync(
        ModuleReportFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@FromDate", filter.FromDate?.Date);
        p.Add("@ToDate", filter.ToDate?.Date);
        p.Add("@OrgID", filter.OrgID);

        return (await connection.QueryAsync<InwardRegisterLineDto>(
            new CommandDefinition(
                "dbo.sp_InwardRegister_GetReport",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false)).AsList();
    }

    public async Task<IReadOnlyList<OutwardRegisterLineDto>> GetOutwardRegisterAsync(
        ModuleReportFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@FromDate", filter.FromDate?.Date);
        p.Add("@ToDate", filter.ToDate?.Date);
        p.Add("@OrgID", filter.OrgID);

        return (await connection.QueryAsync<OutwardRegisterLineDto>(
            new CommandDefinition(
                "dbo.sp_OutwardRegister_GetReport",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false)).AsList();
    }

    public async Task<(ModuleReportHeaderDto? Header, IReadOnlyList<StockRegisterLineDto> Lines)> GetStockRegisterAsync(
        ModuleReportFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@ItemGroupID", filter.ItemGroupID);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_StockRegister_GetReport",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var header = await multi.ReadFirstOrDefaultAsync<ModuleReportHeaderDto>().ConfigureAwait(false);
        var lines = (await multi.ReadAsync<StockRegisterLineDto>().ConfigureAwait(false)).AsList();
        return (header, lines);
    }
}
