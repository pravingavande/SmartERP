using SmartEPR.Core.DTOs.Dashboard;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class NoticeService : INoticeService
{
    private readonly INoticeRepository _noticeRepository;

    public NoticeService(INoticeRepository noticeRepository)
    {
        _noticeRepository = noticeRepository;
    }

    public async Task<IReadOnlyList<NoticeItemDto>> GetRecentAsync(long userId, int topCount = 10, bool upcomingOnly = false, CancellationToken cancellationToken = default)
    {
        if (userId <= 0) return [];

        var items = await _noticeRepository.GetRecentAsync(userId, topCount, upcomingOnly, cancellationToken).ConfigureAwait(false);

        return items.Select(n => new NoticeItemDto
        {
            Tid = n.EventID,
            NoticeDate = n.EventDate,
            Title = n.Title,
            EventPhotoAttachment = n.EventPhotoAttachment,
            EventNewsAttachment = n.EventNewsAttachment,
            IsNew = n.IsNew == 1
        }).ToList();
    }
}
