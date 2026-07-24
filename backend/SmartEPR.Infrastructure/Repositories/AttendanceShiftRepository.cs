using System.Data;
using Dapper;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class AttendanceShiftRepository : IAttendanceShiftRepository
{
    private readonly StoredProcedureExecutor _executor;

    public AttendanceShiftRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<AttendanceShiftDto>> GetListAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<AttendanceShiftDto>("dbo.sp_AttendanceShift_GetList", p, cancellationToken);
    }

    public Task<AttendanceShiftDto?> GetByIdAsync(long shiftId, long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ShiftID", shiftId);
        p.Add("@OrgID", orgId);
        return _executor.QuerySingleOrDefaultAsync<AttendanceShiftDto>("dbo.sp_AttendanceShift_GetById", p, cancellationToken);
    }

    public async Task<long> SaveAsync(AttendanceShiftDto shift, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ShiftID", shift.ShiftID > 0 ? shift.ShiftID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@OrgID", shift.OrgID);
        p.Add("@ShiftName", shift.ShiftName);
        p.Add("@ShiftCode", shift.ShiftCode);
        p.Add("@StartTime", shift.StartTime);
        p.Add("@EndTime", shift.EndTime);
        p.Add("@GraceMinutes", shift.GraceMinutes);
        p.Add("@EarlyCheckinMinutes", shift.EarlyCheckinMinutes);
        p.Add("@IsNightShift", shift.IsNightShift);
        p.Add("@WorkingDays", shift.WorkingDays);
        p.Add("@IsActive", shift.IsActive);
        p.Add("@TimingMode", shift.TimingMode);
        p.Add("@RequiredWorkMinutes", shift.RequiredWorkMinutes);
        p.Add("@LunchMinutes", shift.LunchMinutes);
        p.Add("@FlexWindowStart", shift.FlexWindowStart);
        p.Add("@FlexWindowEnd", shift.FlexWindowEnd);
        await _executor.ExecuteAsync("dbo.sp_AttendanceShift_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@ShiftID");
    }

    public Task DeleteAsync(long shiftId, long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ShiftID", shiftId);
        p.Add("@OrgID", orgId);
        return _executor.ExecuteAsync("dbo.sp_AttendanceShift_Delete", p, cancellationToken);
    }
}
