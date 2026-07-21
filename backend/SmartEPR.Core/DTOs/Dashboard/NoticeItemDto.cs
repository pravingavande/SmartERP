namespace SmartEPR.Core.DTOs.Dashboard;

public sealed class NoticeItemDto
{
    public long Tid { get; init; }
    public DateTime NoticeDate { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Attachment { get; init; }
    public string? EventPhotoAttachment { get; init; }
    public string? EventNewsAttachment { get; init; }
    public bool IsNew { get; init; }
}
