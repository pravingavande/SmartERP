using Dapper;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class AttendanceMonthlyOffRepository : IAttendanceMonthlyOffRepository
{
    private readonly StoredProcedureExecutor _executor;

    public AttendanceMonthlyOffRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<AttendanceMonthlyOffEmployeeSourceDto>> GetEmployeesAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<AttendanceMonthlyOffEmployeeSourceDto>("dbo.sp_AttendanceMonthlyOff_GetEmployees", p, cancellationToken);
    }

    public Task<IReadOnlyList<AttendanceMonthlyOffOverrideRowDto>> GetOverridesAsync(
        long orgId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@FromDate", fromDate.Date);
        p.Add("@ToDate", toDate.Date);
        return _executor.QueryListAsync<AttendanceMonthlyOffOverrideRowDto>("dbo.sp_AttendanceMonthlyOff_GetOverrides", p, cancellationToken);
    }

    public Task SetOverrideAsync(long orgId, long userId, DateTime workDate, string overrideType, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@UserID", userId);
        p.Add("@WorkDate", workDate.Date);
        p.Add("@OverrideType", overrideType);
        return _executor.ExecuteAsync("dbo.sp_AttendanceMonthlyOff_SetOverride", p, cancellationToken);
    }
}
