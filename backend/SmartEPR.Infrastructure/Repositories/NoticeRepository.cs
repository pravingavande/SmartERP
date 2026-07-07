using Dapper;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class NoticeRepository : INoticeRepository
{
    private readonly StoredProcedureExecutor _executor;

    public NoticeRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<NoticeItem>> GetRecentAsync(int topCount, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@TopCount", topCount);

        return _executor.QueryListAsync<NoticeItem>(
            "dbo.sp_Notice_GetRecent",
            parameters,
            cancellationToken);
    }
}
