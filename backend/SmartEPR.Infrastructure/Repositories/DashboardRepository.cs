using Dapper;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class DashboardRepository : IDashboardRepository
{
    private readonly StoredProcedureExecutor _executor;

    public DashboardRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<DashboardSummary?> GetSummaryByOrgIdAsync(int orgId, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@OrgID", orgId);

        return _executor.QuerySingleOrDefaultAsync<DashboardSummary>(
            "dbo.sp_Dashboard_GetSummary",
            parameters,
            cancellationToken);
    }
}
