using SmartEPR.Core.DTOs.Dashboard;

namespace SmartEPR.Core.Interfaces;

public interface INoticeService
{
    Task<IReadOnlyList<NoticeItemDto>> GetRecentAsync(long userId, int topCount = 10, bool upcomingOnly = false, CancellationToken cancellationToken = default);
}
