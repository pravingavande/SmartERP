using Dapper;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class AttendancePayrollRepository : IAttendancePayrollRepository
{
    private readonly StoredProcedureExecutor _executor;

    public AttendancePayrollRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<AttendancePayrollEmployeeSourceDto>> GetEmployeesAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<AttendancePayrollEmployeeSourceDto>("dbo.sp_AttendancePayroll_GetEmployees", p, cancellationToken);
    }

    public Task<IReadOnlyList<AttendancePayrollPresentDateDto>> GetPresentDatesAsync(
        long orgId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@FromDate", fromDate.Date);
        p.Add("@ToDate", toDate.Date);
        return _executor.QueryListAsync<AttendancePayrollPresentDateDto>("dbo.sp_AttendancePayroll_GetPresentDates", p, cancellationToken);
    }

    public Task<IReadOnlyList<AttendancePayrollApprovedLeaveDto>> GetApprovedLeavesAsync(
        long orgId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@FromDate", fromDate.Date);
        p.Add("@ToDate", toDate.Date);
        return _executor.QueryListAsync<AttendancePayrollApprovedLeaveDto>("dbo.sp_AttendancePayroll_GetApprovedLeaves", p, cancellationToken);
    }
}
