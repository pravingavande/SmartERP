using System.Data;
using Dapper;
using SmartEPR.Core.DTOs.Reports;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class CashBookReportRepository : ICashBookReportRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public CashBookReportRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<(CashBookHeaderDto? Header, IReadOnlyList<CashBookLineDto> Lines)> GetReportAsync(
        CashBookReportFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@FromDate", filter.FromDate?.Date);
        p.Add("@ToDate", filter.ToDate?.Date);
        p.Add("@AccountRegisterID", filter.AccountRegisterID <= 0 ? 1 : filter.AccountRegisterID);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_CashBook_GetReport",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var header = await multi.ReadFirstOrDefaultAsync<CashBookHeaderDto>().ConfigureAwait(false);
        var lines = (await multi.ReadAsync<CashBookLineDto>().ConfigureAwait(false)).AsList();
        return (header, lines);
    }
}
