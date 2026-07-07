using Dapper;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class AcademicCalendarRepository : IAcademicCalendarRepository
{
    private readonly StoredProcedureExecutor _executor;

    public AcademicCalendarRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<HolidayItem>> GetHolidaysAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@FromDate", fromDate.Date);
        parameters.Add("@ToDate", toDate.Date);
        return _executor.QueryListAsync<HolidayItem>("dbo.sp_Holiday_GetByDateRange", parameters, cancellationToken);
    }

    public Task<IReadOnlyList<FestivalItem>> GetFestivalsAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@FromDate", fromDate.Date);
        parameters.Add("@ToDate", toDate.Date);
        return _executor.QueryListAsync<FestivalItem>("dbo.sp_Festival_GetByDateRange", parameters, cancellationToken);
    }

    public async Task<int> SaveHolidayAsync(HolidayItem item, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@HolidayId", item.HolidayId > 0 ? item.HolidayId : (int?)null, dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.InputOutput);
        parameters.Add("@HolidayDate", item.HolidayDate.Date);
        parameters.Add("@NameMr", item.NameMr);
        parameters.Add("@NameEn", item.NameEn);
        parameters.Add("@HolidayType", item.HolidayType);
        parameters.Add("@Color", item.Color);
        parameters.Add("@Year", item.Year);

        await _executor.ExecuteAsync("dbo.sp_Holiday_Save", parameters, cancellationToken).ConfigureAwait(false);
        return parameters.Get<int>("@HolidayId");
    }

    public async Task<int> SaveFestivalAsync(FestivalItem item, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@FestivalId", item.FestivalId > 0 ? item.FestivalId : (int?)null, dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.InputOutput);
        parameters.Add("@FestivalDate", item.FestivalDate.Date);
        parameters.Add("@NameMr", item.NameMr);
        parameters.Add("@NameEn", item.NameEn);
        parameters.Add("@Color", item.Color);
        parameters.Add("@Year", item.Year);

        await _executor.ExecuteAsync("dbo.sp_Festival_Save", parameters, cancellationToken).ConfigureAwait(false);
        return parameters.Get<int>("@FestivalId");
    }

    public Task DeleteHolidayAsync(int holidayId, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@HolidayId", holidayId);
        return _executor.ExecuteAsync("dbo.sp_Holiday_Delete", parameters, cancellationToken);
    }

    public Task DeleteFestivalAsync(int festivalId, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@FestivalId", festivalId);
        return _executor.ExecuteAsync("dbo.sp_Festival_Delete", parameters, cancellationToken);
    }
}
