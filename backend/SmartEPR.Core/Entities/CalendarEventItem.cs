namespace SmartEPR.Core.Entities;

public sealed class CalendarEventItem
{
    public int EventID { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime EventDate { get; init; }
    public TimeSpan? StartTime { get; init; }
    public TimeSpan? EndTime { get; init; }
    public bool IsAllDay { get; init; }
    public int? EventTypeID { get; init; }
    public string? EventTypeName { get; init; }
    public int? LocationID { get; init; }
    public string? Location { get; init; }
    public string? Color { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public long? UnderOrgID { get; init; }
    public int? OrgID { get; init; }
    public long? SchoolCode { get; init; }
    public string? SchoolNames { get; init; }
    public string? OrgIDs { get; init; }
    public string? EventReporting { get; init; }
    public string? EventPhotoAttachment { get; init; }
    public string? EventNewsAttachment { get; init; }
    public long? CreatedByUserId { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public bool IsLocked { get; init; }
}

public sealed class EventTypeItem
{
    public int EventTypeID { get; init; }
    public long UnderOrgID { get; init; }
    public int SrNo { get; init; }
    public string EventType { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public string? UnderOrgName { get; init; }
}

public sealed class LocationItem
{
    public int LocationID { get; init; }
    public long UnderOrgID { get; init; }
    public string LocationName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public sealed class EventUserContextItem
{
    public bool CanManageEvents { get; init; }
    public int UserTypeID { get; init; }
}

public sealed class PendingEventReportingItem
{
    public int EventID { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateTime EventDate { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? SchoolNames { get; init; }
    public string? EventReporting { get; init; }
}
