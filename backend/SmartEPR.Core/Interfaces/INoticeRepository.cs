using SmartEPR.Core.Entities;

namespace SmartEPR.Core.Interfaces;

public interface INoticeRepository
{
    Task<IReadOnlyList<NoticeItem>> GetRecentAsync(long userId, int topCount, bool upcomingOnly = false, CancellationToken cancellationToken = default);
}
