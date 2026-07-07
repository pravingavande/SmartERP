using SmartEPR.Core.DTOs.Calendar;

namespace SmartEPR.Core.Interfaces;

public interface IAcademicCalendarService
{
    Task<AcademicCalendarDto> GetCalendarAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    Task<HolidayDto?> SaveHolidayAsync(SaveHolidayRequestDto request, CancellationToken cancellationToken = default);
    Task<FestivalDto?> SaveFestivalAsync(SaveFestivalRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteHolidayAsync(int holidayId, CancellationToken cancellationToken = default);
    Task<bool> DeleteFestivalAsync(int festivalId, CancellationToken cancellationToken = default);
}

public interface IEventCalendarService
{
    Task<IReadOnlyList<EventTypeDto>> GetEventTypesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CalendarEventDto>> GetEventsAsync(long userId, DateTime fromDate, DateTime toDate, string? search, CancellationToken cancellationToken = default);
    Task<CalendarEventDto?> GetEventByIdAsync(int eventId, CancellationToken cancellationToken = default);
    Task<CalendarEventDto?> SaveEventAsync(long userId, SaveEventRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteEventAsync(int eventId, CancellationToken cancellationToken = default);
}
