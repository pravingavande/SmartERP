namespace SmartEPR.Core.Entities;

public sealed class NoticeItem
{
    public int EventID { get; init; }
    public DateTime EventDate { get; init; }
    public DateTime CreatedAt { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? EventPhotoAttachment { get; init; }
    public string? EventNewsAttachment { get; init; }
    public int IsNew { get; init; }
}
