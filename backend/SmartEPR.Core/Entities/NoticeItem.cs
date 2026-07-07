namespace SmartEPR.Core.Entities;

public sealed class NoticeItem
{
    public long TID { get; init; }
    public DateTime TDate { get; init; }
    public string Notice { get; init; } = string.Empty;
    public string? Attachment { get; init; }
    public int IsNew { get; init; }
}
