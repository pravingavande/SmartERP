using SmartEPR.Core.Entities;

namespace SmartEPR.Core.Interfaces;

public interface IAcademicCalendarRepository
{
    Task<IReadOnlyList<HolidayItem>> GetHolidaysAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FestivalItem>> GetFestivalsAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    Task<int> SaveHolidayAsync(HolidayItem item, CancellationToken cancellationToken = default);
    Task<int> SaveFestivalAsync(FestivalItem item, CancellationToken cancellationToken = default);
    Task DeleteHolidayAsync(int holidayId, CancellationToken cancellationToken = default);
    Task DeleteFestivalAsync(int festivalId, CancellationToken cancellationToken = default);
}

public interface IEventCalendarRepository
{
    Task<EventUserContextItem> GetUserContextAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EventTypeItem>> GetEventTypesAsync(long? underOrgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EventTypeItem>> GetEventTypeListAsync(long? underOrgId, CancellationToken cancellationToken = default);
    Task<int> SaveEventTypeAsync(SaveEventTypeEntity request, CancellationToken cancellationToken = default);
    Task DeleteEventTypeAsync(int eventTypeId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LocationItem>> GetLocationsAsync(long underOrgId, string? search, CancellationToken cancellationToken = default);
    Task<int> SaveLocationAsync(long underOrgId, string locationName, int? locationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CalendarEventItem>> GetEventsAsync(long userId, DateTime fromDate, DateTime toDate, int? orgId, string? search, CancellationToken cancellationToken = default);
    Task<CalendarEventItem?> GetEventByIdAsync(int eventId, CancellationToken cancellationToken = default);
    Task<int> SaveEventAsync(SaveEventEntity item, CancellationToken cancellationToken = default);
    Task DeleteEventAsync(int eventId, bool canManageEvents, CancellationToken cancellationToken = default);
    Task<int> GetPendingReportingCountAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PendingEventReportingItem>> GetPendingReportingListAsync(long userId, CancellationToken cancellationToken = default);
}

public sealed class SaveEventTypeEntity
{
    public int? EventTypeID { get; init; }
    public long UnderOrgID { get; init; }
    public string EventType { get; init; } = string.Empty;
    public bool IsActive { get; init; } = true;
    public long? UserID { get; init; }
}

public sealed class SaveEventEntity
{
    public int EventID { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTime EventDate { get; init; }
    public TimeSpan? StartTime { get; init; }
    public TimeSpan? EndTime { get; init; }
    public bool IsAllDay { get; init; }
    public int? EventTypeID { get; init; }
    public int? LocationID { get; init; }
    public string? Location { get; init; }
    public string? Color { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public long? UnderOrgID { get; init; }
    public string OrgIDs { get; init; } = string.Empty;
    public string? EventReporting { get; init; }
    public string? EventPhotoAttachment { get; init; }
    public string? EventNewsAttachment { get; init; }
    public int? OrgID { get; init; }
    public long? SchoolCode { get; init; }
    public long? CreatedByUserId { get; init; }
    public bool CanManageEvents { get; init; }
}
