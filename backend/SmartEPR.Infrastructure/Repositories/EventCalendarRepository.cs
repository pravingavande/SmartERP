using Dapper;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class EventCalendarRepository : IEventCalendarRepository
{
    private readonly StoredProcedureExecutor _executor;

    public EventCalendarRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public async Task<EventUserContextItem> GetUserContextAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        var row = await _executor.QuerySingleOrDefaultAsync<EventUserContextItem>("dbo.sp_Event_GetUserContext", p, cancellationToken).ConfigureAwait(false);
        return row ?? new EventUserContextItem();
    }

    public Task<IReadOnlyList<EventTypeItem>> GetEventTypesAsync(long? underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<EventTypeItem>("dbo.sp_EventType_GetAll", p, cancellationToken);
    }

    public Task<IReadOnlyList<EventTypeItem>> GetEventTypeListAsync(long? underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<EventTypeItem>("dbo.sp_EventType_GetList", p, cancellationToken);
    }

    public async Task<int> SaveEventTypeAsync(SaveEventTypeEntity request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@EventTypeID", request.EventTypeID > 0 ? request.EventTypeID : null, dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@EventType", request.EventType);
        p.Add("@IsActive", request.IsActive);
        p.Add("@UserID", request.UserID);
        await _executor.ExecuteAsync("dbo.sp_EventType_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<int>("@EventTypeID");
    }

    public Task DeleteEventTypeAsync(int eventTypeId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@EventTypeID", eventTypeId);
        return _executor.ExecuteAsync("dbo.sp_EventType_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<LocationItem>> GetLocationsAsync(long underOrgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<LocationItem>("dbo.sp_Location_GetList", p, cancellationToken);
    }

    public async Task<int> SaveLocationAsync(long underOrgId, string locationName, int? locationId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LocationID", locationId > 0 ? locationId : null, dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", underOrgId);
        p.Add("@LocationName", locationName);
        await _executor.ExecuteAsync("dbo.sp_Location_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<int>("@LocationID");
    }

    public Task<IReadOnlyList<CalendarEventItem>> GetEventsAsync(long userId, DateTime fromDate, DateTime toDate, int? orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@FromDate", fromDate.Date);
        p.Add("@ToDate", toDate.Date);
        p.Add("@UserID", userId);
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<CalendarEventItem>("dbo.sp_Event_GetByDateRange", p, cancellationToken);
    }

    public Task<CalendarEventItem?> GetEventByIdAsync(int eventId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@EventID", eventId);
        return _executor.QuerySingleOrDefaultAsync<CalendarEventItem>("dbo.sp_Event_GetById", p, cancellationToken);
    }

    public async Task<int> SaveEventAsync(SaveEventEntity item, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@EventID", item.EventID > 0 ? item.EventID : null, dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@Title", item.Title);
        p.Add("@Description", item.Description);
        p.Add("@EventDate", item.EventDate.Date);
        p.Add("@StartTime", item.StartTime);
        p.Add("@EndTime", item.EndTime);
        p.Add("@IsAllDay", item.IsAllDay);
        p.Add("@EventTypeID", item.EventTypeID);
        p.Add("@LocationID", item.LocationID);
        p.Add("@Location", item.Location);
        p.Add("@Color", item.Color);
        p.Add("@Status", item.Status);
        p.Add("@Notes", item.Notes);
        p.Add("@UnderOrgID", item.UnderOrgID);
        p.Add("@OrgIDs", item.OrgIDs);
        p.Add("@EventReporting", item.EventReporting);
        p.Add("@EventPhotoAttachment", item.EventPhotoAttachment);
        p.Add("@EventNewsAttachment", item.EventNewsAttachment);
        p.Add("@OrgID", item.OrgID);
        p.Add("@SchoolCode", item.SchoolCode);
        p.Add("@CreatedByUserId", item.CreatedByUserId);
        p.Add("@CanManageEvents", item.CanManageEvents);
        await _executor.ExecuteAsync("dbo.sp_Event_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<int>("@EventID");
    }

    public Task DeleteEventAsync(int eventId, bool canManageEvents, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@EventID", eventId);
        p.Add("@CanManageEvents", canManageEvents);
        return _executor.ExecuteAsync("dbo.sp_Event_Delete", p, cancellationToken);
    }

    public async Task<int> GetPendingReportingCountAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        var row = await _executor.QuerySingleOrDefaultAsync<PendingCountRow>("dbo.sp_Event_GetPendingReportingCount", p, cancellationToken).ConfigureAwait(false);
        return row?.PendingCount ?? 0;
    }

    public Task<IReadOnlyList<PendingEventReportingItem>> GetPendingReportingListAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        return _executor.QueryListAsync<PendingEventReportingItem>("dbo.sp_Event_GetPendingReportingList", p, cancellationToken);
    }

    private sealed class PendingCountRow
    {
        public int PendingCount { get; init; }
    }
}
