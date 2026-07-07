namespace SmartEPR.Core.DTOs.Calendar;

public sealed class EventTypeDto
{
    public int EventTypeId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string NameMr { get; init; } = string.Empty;
    public string? DefaultColor { get; init; }
    public int SortOrder { get; init; }
}

public sealed class CalendarEventDto
{
    public int EventId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime EventDate { get; init; }
    public string? StartTime { get; init; }
    public string? EndTime { get; init; }
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
}

public sealed class SaveEventRequestDto
{
    public int? EventId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime EventDate { get; init; }
    public string? StartTime { get; init; }
    public string? EndTime { get; init; }
    public bool IsAllDay { get; init; }
    public int? EventTypeId { get; init; }
    public string Priority { get; init; } = "मध्यम";
    public string? Location { get; init; }
    public long? OrganizerUserId { get; init; }
    public string? OrganizerName { get; init; }
    public string? Color { get; init; }
    public string Status { get; init; } = "नियोजित";
    public string? Notes { get; init; }
}
