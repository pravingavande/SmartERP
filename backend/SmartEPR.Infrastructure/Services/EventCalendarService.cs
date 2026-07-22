using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Calendar;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Services;

public sealed class EventCalendarService : IEventCalendarService
{
    private readonly IEventCalendarRepository _eventRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAuditVoucherRepository _auditRepository;

    public EventCalendarService(
        IEventCalendarRepository eventRepository,
        IUserRepository userRepository,
        IAuditVoucherRepository auditRepository)
    {
        _eventRepository = eventRepository;
        _userRepository = userRepository;
        _auditRepository = auditRepository;
    }

    public async Task<EventLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        var orgs = await _auditRepository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        var sansthaOrgs = orgs.Where(o => o.OrgID == o.UnderOrgID || o.UnderOrgID is null).Select(o => o.OrgID).ToList();
        if (sansthaOrgs.Count == 0 && orgs.Count > 0)
            sansthaOrgs = [orgs[0].OrgID];

        IReadOnlyList<EventTypeItem> types = [];
        try
        {
            var underOrgId = sansthaOrgs.FirstOrDefault();
            types = await _eventRepository.GetEventTypesAsync(underOrgId > 0 ? underOrgId : null, cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            // EventTypes V2 schema/SP may not be deployed yet — still return org lookups.
        }

        return new EventLookupsDto
        {
            EventTypes = types.Select(MapEventType).ToList(),
            Orgs = orgs,
            SansthaOrgs = sansthaOrgs,
            CanManageEvents = context.CanManageEvents,
            IsSansthaUser = orgs.Count > 1
        };
    }

    public async Task<IReadOnlyList<EventTypeDto>> GetEventTypeMasterListAsync(long userId, long? underOrgId, CancellationToken cancellationToken = default)
    {
        var types = await _eventRepository.GetEventTypeListAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return types.Select(MapEventType).ToList();
    }

    public async Task<EventTypeDto?> SaveEventTypeAsync(long userId, SaveEventTypeRequestDto request, CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (!context.CanManageEvents || request.UnderOrgID <= 0 || string.IsNullOrWhiteSpace(request.EventType))
            return null;

        try
        {
            var id = await _eventRepository.SaveEventTypeAsync(new SaveEventTypeEntity
            {
                EventTypeID = request.EventTypeID,
                UnderOrgID = request.UnderOrgID,
                EventType = request.EventType.Trim(),
                IsActive = request.IsActive,
                UserID = userId
            }, cancellationToken).ConfigureAwait(false);

            if (id <= 0)
                throw new InvalidOperationException("Unable to save event type.");

            var list = await _eventRepository.GetEventTypeListAsync(request.UnderOrgID, cancellationToken).ConfigureAwait(false);
            return list.Where(x => x.EventTypeID == id).Select(MapEventType).FirstOrDefault();
        }
        catch (SqlException ex)
        {
            throw new InvalidOperationException(SqlErrorMapper.ToUserMessage(ex, "Event Types"), ex);
        }
    }

    public async Task<bool> DeleteEventTypeAsync(long userId, int eventTypeId, CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (!context.CanManageEvents) return false;
        await _eventRepository.DeleteEventTypeAsync(eventTypeId, cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<(ImportClassResultDto? Data, string? Error)> ImportEventTypesAsync(
        long userId,
        ImportEventTypeRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (!context.CanManageEvents)
            return (null, "You do not have permission to import event types.");

        if (request.DestinationOrgID <= 0)
            return (null, "Organization is required.");
        if (request.DestinationOrgID == 1)
            return (null, "Cannot import into the source organization.");
        if (request.EventTypeIds is null || request.EventTypeIds.Count == 0)
            return (null, "Select at least one event type to import.");

        try
        {
            const long sourceOrgId = 1;
            var selected = request.EventTypeIds.Where(id => id > 0).Distinct().ToHashSet();
            var sourceRows = (await _eventRepository.GetEventTypeListAsync(sourceOrgId, cancellationToken).ConfigureAwait(false))
                .Where(x => selected.Contains(x.EventTypeID) && x.IsActive)
                .OrderBy(x => x.SrNo)
                .ThenBy(x => x.EventTypeID)
                .ToList();

            var destRows = await _eventRepository.GetEventTypeListAsync(request.DestinationOrgID, cancellationToken).ConfigureAwait(false);
            var existingNames = destRows
                .Select(x => x.EventType.Trim())
                .Where(x => x.Length > 0)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var imported = 0;
            var skipped = 0;

            foreach (var row in sourceRows)
            {
                var name = (row.EventType ?? string.Empty).Trim();
                if (name.Length == 0 || existingNames.Contains(name))
                {
                    skipped++;
                    continue;
                }

                await _eventRepository.SaveEventTypeAsync(new SaveEventTypeEntity
                {
                    EventTypeID = null,
                    UnderOrgID = request.DestinationOrgID,
                    EventType = name,
                    IsActive = row.IsActive,
                    UserID = userId
                }, cancellationToken).ConfigureAwait(false);

                existingNames.Add(name);
                imported++;
            }

            skipped += Math.Max(0, selected.Count - sourceRows.Count);

            return (new ImportClassResultDto { ImportedCount = imported, SkippedCount = skipped }, null);
        }
        catch (SqlException ex)
        {
            return (null, SqlErrorMapper.ToUserMessage(ex, "Event Types"));
        }
    }

    public async Task<IReadOnlyList<LocationDto>> SearchLocationsAsync(long userId, long underOrgId, string? search, CancellationToken cancellationToken = default)
    {
        var items = await _eventRepository.GetLocationsAsync(underOrgId, search, cancellationToken).ConfigureAwait(false);
        return items.Select(x => new LocationDto
        {
            LocationID = x.LocationID,
            UnderOrgID = x.UnderOrgID,
            LocationName = x.LocationName,
            IsActive = x.IsActive
        }).ToList();
    }

    public async Task<LocationDto?> SaveLocationAsync(long userId, SaveLocationRequestDto request, CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (!context.CanManageEvents || string.IsNullOrWhiteSpace(request.LocationName))
            return null;

        var id = await _eventRepository.SaveLocationAsync(request.UnderOrgID, request.LocationName.Trim(), request.LocationID, cancellationToken).ConfigureAwait(false);
        var items = await _eventRepository.GetLocationsAsync(request.UnderOrgID, request.LocationName, cancellationToken).ConfigureAwait(false);
        var item = items.FirstOrDefault(x => x.LocationID == id);
        return item is null ? null : new LocationDto
        {
            LocationID = item.LocationID,
            UnderOrgID = item.UnderOrgID,
            LocationName = item.LocationName,
            IsActive = item.IsActive
        };
    }

    public async Task<IReadOnlyList<CalendarEventDto>> GetEventsAsync(long userId, DateTime fromDate, DateTime toDate, string? search, CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        try
        {
            var events = await _eventRepository.GetEventsAsync(userId, fromDate, toDate, null, search, cancellationToken).ConfigureAwait(false);
            return events.Select(e => MapEvent(e, context.CanManageEvents)).ToList();
        }
        catch (SqlException ex)
        {
            throw new InvalidOperationException(SqlErrorMapper.ToUserMessage(ex, "Event Calendar"), ex);
        }
    }

    public async Task<CalendarEventDto?> GetEventByIdAsync(long userId, int eventId, CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        try
        {
            var item = await _eventRepository.GetEventByIdAsync(eventId, cancellationToken).ConfigureAwait(false);
            return item is null ? null : MapEvent(item, context.CanManageEvents);
        }
        catch (SqlException ex)
        {
            throw new InvalidOperationException(SqlErrorMapper.ToUserMessage(ex, "Event Calendar"), ex);
        }
    }

    public async Task<CalendarEventDto?> SaveEventAsync(long userId, SaveEventRequestDto request, CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (!context.CanManageEvents || request.OrgIDs.Count == 0)
            return null;

        if (string.IsNullOrWhiteSpace(request.Title))
            return null;

        if (string.IsNullOrWhiteSpace(request.Location))
            return null;

        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        var underOrgId = request.UnderOrgID ?? profile?.OrgID;

        try
        {
            var eventId = await _eventRepository.SaveEventAsync(new SaveEventEntity
            {
                EventID = request.EventID ?? 0,
                Title = request.Title.Trim(),
                Description = request.Description,
                EventDate = request.EventDate,
                StartTime = ParseTime(request.StartTime),
                EndTime = ParseTime(request.EndTime),
                IsAllDay = request.IsAllDay,
                EventTypeID = request.EventTypeID,
                LocationID = request.LocationID,
                Location = request.Location.Trim(),
                Color = request.Color,
                Status = request.Status,
                Notes = request.Notes,
                UnderOrgID = underOrgId,
                OrgIDs = string.Join(",", request.OrgIDs),
                EventReporting = request.EventReporting,
                EventPhotoAttachment = request.EventPhotoAttachment,
                EventNewsAttachment = request.EventNewsAttachment,
                OrgID = (int?)request.OrgIDs.FirstOrDefault(),
                SchoolCode = profile?.OrgID,
                CreatedByUserId = userId,
                CanManageEvents = context.CanManageEvents
            }, cancellationToken).ConfigureAwait(false);

            if (eventId <= 0)
                throw new InvalidOperationException("Unable to save event.");

            return await GetEventByIdAsync(userId, eventId, cancellationToken).ConfigureAwait(false);
        }
        catch (SqlException ex)
        {
            throw new InvalidOperationException(SqlErrorMapper.ToUserMessage(ex, "Event Calendar"), ex);
        }
    }

    public async Task<bool> DeleteEventAsync(long userId, int eventId, CancellationToken cancellationToken = default)
    {
        var context = await _eventRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (!context.CanManageEvents) return false;
        await _eventRepository.DeleteEventAsync(eventId, context.CanManageEvents, cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<PendingEventReportingSummaryDto> GetPendingReportingAsync(long userId, CancellationToken cancellationToken = default)
    {
        var count = await _eventRepository.GetPendingReportingCountAsync(userId, cancellationToken).ConfigureAwait(false);
        var items = await _eventRepository.GetPendingReportingListAsync(userId, cancellationToken).ConfigureAwait(false);
        return new PendingEventReportingSummaryDto
        {
            PendingCount = count,
            Items = items.Select(x => new PendingEventReportingDto
            {
                EventID = x.EventID,
                Title = x.Title,
                EventDate = x.EventDate,
                Status = x.Status,
                SchoolNames = x.SchoolNames,
                EventReporting = x.EventReporting
            }).ToList()
        };
    }

    private static EventTypeDto MapEventType(EventTypeItem item) => new()
    {
        EventTypeID = item.EventTypeID,
        UnderOrgID = item.UnderOrgID,
        SrNo = item.SrNo,
        EventType = item.EventType,
        IsActive = item.IsActive,
        UnderOrgName = item.UnderOrgName
    };

    private static CalendarEventDto MapEvent(CalendarEventItem item, bool canManage) => new()
    {
        EventID = item.EventID,
        Title = item.Title,
        Description = item.Description,
        EventDate = item.EventDate,
        StartTime = FormatTime(item.StartTime),
        EndTime = FormatTime(item.EndTime),
        IsAllDay = item.IsAllDay,
        EventTypeID = item.EventTypeID,
        EventTypeName = item.EventTypeName,
        LocationID = item.LocationID,
        Location = item.Location,
        Color = item.Color,
        Status = item.Status,
        Notes = item.Notes,
        UnderOrgID = item.UnderOrgID,
        SchoolNames = item.SchoolNames,
        OrgIDs = item.OrgIDs,
        EventReporting = item.EventReporting,
        EventPhotoAttachment = item.EventPhotoAttachment,
        EventNewsAttachment = item.EventNewsAttachment,
        IsLocked = item.IsLocked,
        CanManage = canManage,
        CanEdit = canManage && !item.IsLocked,
        CanEditReporting = canManage && (item.IsLocked || item.Status == "पूर्ण झाले")
    };

    private static TimeSpan? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return TimeSpan.TryParse(value, out var time) ? time : null;
    }

    private static string? FormatTime(TimeSpan? value) =>
        value.HasValue ? value.Value.ToString(@"hh\:mm") : null;
}
