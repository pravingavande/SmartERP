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
    Task<EventLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EventTypeDto>> GetEventTypeMasterListAsync(long userId, long? underOrgId, CancellationToken cancellationToken = default);
    Task<EventTypeDto?> SaveEventTypeAsync(long userId, SaveEventTypeRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteEventTypeAsync(long userId, int eventTypeId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LocationDto>> SearchLocationsAsync(long userId, long underOrgId, string? search, CancellationToken cancellationToken = default);
    Task<LocationDto?> SaveLocationAsync(long userId, SaveLocationRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CalendarEventDto>> GetEventsAsync(long userId, DateTime fromDate, DateTime toDate, string? search, CancellationToken cancellationToken = default);
    Task<CalendarEventDto?> GetEventByIdAsync(long userId, int eventId, CancellationToken cancellationToken = default);
    Task<CalendarEventDto?> SaveEventAsync(long userId, SaveEventRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteEventAsync(long userId, int eventId, CancellationToken cancellationToken = default);
    Task<PendingEventReportingSummaryDto> GetPendingReportingAsync(long userId, CancellationToken cancellationToken = default);
}
