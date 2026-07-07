using SmartEPR.Core.DTOs.Dashboard;

namespace SmartEPR.Core.Interfaces;

public interface INoticeService
{
    Task<IReadOnlyList<NoticeItemDto>> GetRecentAsync(int topCount = 10, CancellationToken cancellationToken = default);
}
