using SmartEPR.Core.DTOs.Dashboard;

namespace SmartEPR.Core.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryDto?> GetSummaryAsync(int userId, CancellationToken cancellationToken = default);
}
