namespace SmartEPR.Core.Entities;

public sealed class EventTypeItem
{
    public int EventTypeId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string NameMr { get; init; } = string.Empty;
    public string? DefaultColor { get; init; }
    public int SortOrder { get; init; }
}
