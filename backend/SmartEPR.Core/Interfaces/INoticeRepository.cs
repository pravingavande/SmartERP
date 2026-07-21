using SmartEPR.Core.Entities;

namespace SmartEPR.Core.Interfaces;

public interface INoticeRepository
{
    Task<IReadOnlyList<NoticeItem>> GetRecentAsync(long userId, int topCount, CancellationToken cancellationToken = default);
}
