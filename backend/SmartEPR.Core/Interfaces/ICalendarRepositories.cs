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
    Task<IReadOnlyList<EventTypeItem>> GetEventTypesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CalendarEventItem>> GetEventsAsync(DateTime fromDate, DateTime toDate, int? orgId, string? search, CancellationToken cancellationToken = default);
    Task<CalendarEventItem?> GetEventByIdAsync(int eventId, CancellationToken cancellationToken = default);
    Task<int> SaveEventAsync(CalendarEventItem item, CancellationToken cancellationToken = default);
    Task DeleteEventAsync(int eventId, CancellationToken cancellationToken = default);
}
