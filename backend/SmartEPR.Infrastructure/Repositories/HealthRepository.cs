using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class HealthRepository : IHealthRepository
{
    private readonly StoredProcedureExecutor _executor;

    public HealthRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public async Task<bool> PingDatabaseAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _executor.QuerySingleOrDefaultAsync<int>(
                "dbo.sp_Health_Ping",
                cancellationToken: cancellationToken).ConfigureAwait(false);

            return result == 1;
        }
        catch
        {
            return false;
        }
    }
}
