namespace SmartEPR.Core.Entities;

public sealed class CalendarEventItem
{
    public int EventId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime EventDate { get; init; }
    public TimeSpan? StartTime { get; init; }
    public TimeSpan? EndTime { get; init; }
    public bool IsAllDay { get; init; }
    public int? EventTypeId { get; init; }
    public string? EventTypeNameMr { get; init; }
    public string? EventTypeNameEn { get; init; }
    public string? EventTypeColor { get; init; }
    public string Priority { get; init; } = string.Empty;
    public string? Location { get; init; }
    public long? OrganizerUserId { get; init; }
    public string? OrganizerName { get; init; }
    public string? Color { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public int? OrgID { get; init; }
    public long? SchoolCode { get; init; }
    public long? CreatedByUserId { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
