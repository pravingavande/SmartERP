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

    public Task<IReadOnlyList<EventTypeItem>> GetEventTypesAsync(CancellationToken cancellationToken = default)
    {
        return _executor.QueryListAsync<EventTypeItem>("dbo.sp_EventType_GetAll", null, cancellationToken);
    }

    public Task<IReadOnlyList<CalendarEventItem>> GetEventsAsync(DateTime fromDate, DateTime toDate, int? orgId, string? search, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@FromDate", fromDate.Date);
        parameters.Add("@ToDate", toDate.Date);
        parameters.Add("@OrgID", orgId);
        parameters.Add("@Search", search);
        return _executor.QueryListAsync<CalendarEventItem>("dbo.sp_Event_GetByDateRange", parameters, cancellationToken);
    }

    public Task<CalendarEventItem?> GetEventByIdAsync(int eventId, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@EventId", eventId);
        return _executor.QuerySingleOrDefaultAsync<CalendarEventItem>("dbo.sp_Event_GetById", parameters, cancellationToken);
    }

    public async Task<int> SaveEventAsync(CalendarEventItem item, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@EventId", item.EventId > 0 ? item.EventId : (int?)null, dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.InputOutput);
        parameters.Add("@Title", item.Title);
        parameters.Add("@Description", item.Description);
        parameters.Add("@EventDate", item.EventDate.Date);
        parameters.Add("@StartTime", item.StartTime);
        parameters.Add("@EndTime", item.EndTime);
        parameters.Add("@IsAllDay", item.IsAllDay);
        parameters.Add("@EventTypeId", item.EventTypeId);
        parameters.Add("@Priority", item.Priority);
        parameters.Add("@Location", item.Location);
        parameters.Add("@OrganizerUserId", item.OrganizerUserId);
        parameters.Add("@OrganizerName", item.OrganizerName);
        parameters.Add("@Color", item.Color);
        parameters.Add("@Status", item.Status);
        parameters.Add("@Notes", item.Notes);
        parameters.Add("@OrgID", item.OrgID);
        parameters.Add("@SchoolCode", item.SchoolCode);
        parameters.Add("@CreatedByUserId", item.CreatedByUserId);

        await _executor.ExecuteAsync("dbo.sp_Event_Save", parameters, cancellationToken).ConfigureAwait(false);
        return parameters.Get<int>("@EventId");
    }

    public Task DeleteEventAsync(int eventId, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@EventId", eventId);
        return _executor.ExecuteAsync("dbo.sp_Event_Delete", parameters, cancellationToken);
    }
}
