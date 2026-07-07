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

    public async Task<IReadOnlyList<NoticeItemDto>> GetRecentAsync(int topCount = 10, CancellationToken cancellationToken = default)
    {
        var items = await _noticeRepository.GetRecentAsync(topCount, cancellationToken).ConfigureAwait(false);

        return items.Select(n => new NoticeItemDto
        {
            Tid = n.TID,
            NoticeDate = n.TDate,
            Title = n.Notice,
            Attachment = n.Attachment,
            IsNew = n.IsNew == 1
        }).ToList();
    }
}
