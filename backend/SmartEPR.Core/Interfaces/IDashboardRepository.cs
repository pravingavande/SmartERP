using SmartEPR.Core.Entities;

namespace SmartEPR.Core.Interfaces;

public interface IDashboardRepository
{
    Task<DashboardSummary?> GetSummaryByOrgIdAsync(int orgId, CancellationToken cancellationToken = default);
}
