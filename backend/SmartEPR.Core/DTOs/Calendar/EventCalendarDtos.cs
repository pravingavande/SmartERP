namespace SmartEPR.Core.DTOs.Calendar;

public sealed class EventTypeDto
{
    public int EventTypeID { get; init; }
    public long UnderOrgID { get; init; }
    public int SrNo { get; init; }
    public string EventType { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public string? UnderOrgName { get; init; }
}

public sealed class SaveEventTypeRequestDto
{
    public int? EventTypeID { get; init; }
    public long UnderOrgID { get; init; }
    public string EventType { get; init; } = string.Empty;
    public bool IsActive { get; init; } = true;
}

public sealed class LocationDto
{
    public int LocationID { get; init; }
    public long UnderOrgID { get; init; }
    public string LocationName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public sealed class SaveLocationRequestDto
{
    public int? LocationID { get; init; }
    public long UnderOrgID { get; init; }
    public string LocationName { get; init; } = string.Empty;
}

public sealed class CalendarEventDto
{
    public int EventID { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime EventDate { get; init; }
    public string? StartTime { get; init; }
    public string? EndTime { get; init; }
    public bool IsAllDay { get; init; }
    public int? EventTypeID { get; init; }
    public string? EventTypeName { get; init; }
    public int? LocationID { get; init; }
    public string? Location { get; init; }
    public string? Color { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public long? UnderOrgID { get; init; }
    public string? SchoolNames { get; init; }
    public string? OrgIDs { get; init; }
    public string? EventReporting { get; init; }
    public string? EventPhotoAttachment { get; init; }
    public string? EventNewsAttachment { get; init; }
    public bool IsLocked { get; init; }
    public bool CanEdit { get; init; }
    public bool CanManage { get; init; }
    public bool CanEditReporting { get; init; }
}

public sealed class SaveEventRequestDto
{
    public int? EventID { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime EventDate { get; init; }
    public string? StartTime { get; init; }
    public string? EndTime { get; init; }
    public bool IsAllDay { get; init; }
    public int? EventTypeID { get; init; }
    public int? LocationID { get; init; }
    public string? Location { get; init; }
    public string? Color { get; init; }
    public string Status { get; init; } = "नियोजित";
    public string? Notes { get; init; }
    public long? UnderOrgID { get; init; }
    public IReadOnlyList<long> OrgIDs { get; init; } = [];
    public string? EventReporting { get; init; }
    public string? EventPhotoAttachment { get; init; }
    public string? EventNewsAttachment { get; init; }
}

public sealed class EventLookupsDto
{
    public IReadOnlyList<EventTypeDto> EventTypes { get; init; } = [];
    public IReadOnlyList<SmartEPR.Core.DTOs.Audit.OrgOptionDto> Orgs { get; init; } = [];
    public IReadOnlyList<long> SansthaOrgs { get; init; } = [];
    public bool CanManageEvents { get; init; }
    public bool IsSansthaUser { get; init; }
}

public sealed class PendingEventReportingDto
{
    public int EventID { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateTime EventDate { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? SchoolNames { get; init; }
    public string? EventReporting { get; init; }
}

public sealed class PendingEventReportingSummaryDto
{
    public int PendingCount { get; init; }
    public IReadOnlyList<PendingEventReportingDto> Items { get; init; } = [];
}
