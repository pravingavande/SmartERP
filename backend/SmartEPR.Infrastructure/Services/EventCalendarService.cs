using SmartEPR.Core.DTOs.Calendar;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class EventCalendarService : IEventCalendarService
{
    private readonly IEventCalendarRepository _eventRepository;
    private readonly IUserRepository _userRepository;

    public EventCalendarService(IEventCalendarRepository eventRepository, IUserRepository userRepository)
    {
        _eventRepository = eventRepository;
        _userRepository = userRepository;
    }

    public async Task<IReadOnlyList<EventTypeDto>> GetEventTypesAsync(CancellationToken cancellationToken = default)
    {
        var types = await _eventRepository.GetEventTypesAsync(cancellationToken).ConfigureAwait(false);
        return types.Select(t => new EventTypeDto
        {
            EventTypeId = t.EventTypeId,
            Code = t.Code,
            NameEn = t.NameEn,
            NameMr = t.NameMr,
            DefaultColor = t.DefaultColor,
            SortOrder = t.SortOrder
        }).ToList();
    }

    public async Task<IReadOnlyList<CalendarEventDto>> GetEventsAsync(long userId, DateTime fromDate, DateTime toDate, string? search, CancellationToken cancellationToken = default)
    {
        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        var orgId = profile?.OrgID;

        var events = await _eventRepository.GetEventsAsync(fromDate, toDate, orgId, search, cancellationToken).ConfigureAwait(false);
        return events.Select(MapEvent).ToList();
    }

    public async Task<CalendarEventDto?> GetEventByIdAsync(int eventId, CancellationToken cancellationToken = default)
    {
        var item = await _eventRepository.GetEventByIdAsync(eventId, cancellationToken).ConfigureAwait(false);
        return item is null ? null : MapEvent(item);
    }

    public async Task<CalendarEventDto?> SaveEventAsync(long userId, SaveEventRequestDto request, CancellationToken cancellationToken = default)
    {
        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);

        var eventId = await _eventRepository.SaveEventAsync(new CalendarEventItem
        {
            EventId = request.EventId ?? 0,
            Title = request.Title.Trim(),
            Description = request.Description,
            EventDate = request.EventDate,
            StartTime = ParseTime(request.StartTime),
            EndTime = ParseTime(request.EndTime),
            IsAllDay = request.IsAllDay,
            EventTypeId = request.EventTypeId,
            Priority = request.Priority,
            Location = request.Location,
            OrganizerUserId = request.OrganizerUserId ?? userId,
            OrganizerName = request.OrganizerName ?? profile?.DisplayName,
            Color = request.Color,
            Status = request.Status,
            Notes = request.Notes,
            OrgID = profile?.OrgID,
            SchoolCode = profile?.SchoolCode,
            CreatedByUserId = userId
        }, cancellationToken).ConfigureAwait(false);

        return await GetEventByIdAsync(eventId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> DeleteEventAsync(int eventId, CancellationToken cancellationToken = default)
    {
        await _eventRepository.DeleteEventAsync(eventId, cancellationToken).ConfigureAwait(false);
        return true;
    }

    private static CalendarEventDto MapEvent(CalendarEventItem item) => new()
    {
        EventId = item.EventId,
        Title = item.Title,
        Description = item.Description,
        EventDate = item.EventDate,
        StartTime = FormatTime(item.StartTime),
        EndTime = FormatTime(item.EndTime),
        IsAllDay = item.IsAllDay,
        EventTypeId = item.EventTypeId,
        EventTypeNameMr = item.EventTypeNameMr,
        EventTypeNameEn = item.EventTypeNameEn,
        EventTypeColor = item.EventTypeColor,
        Priority = item.Priority,
        Location = item.Location,
        OrganizerUserId = item.OrganizerUserId,
        OrganizerName = item.OrganizerName,
        Color = item.Color,
        Status = item.Status,
        Notes = item.Notes
    };

    private static TimeSpan? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return TimeSpan.TryParse(value, out var time) ? time : null;
    }

    private static string? FormatTime(TimeSpan? value) =>
        value.HasValue ? value.Value.ToString(@"hh\:mm") : null;
}
