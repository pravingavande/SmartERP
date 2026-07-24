using System.Data;
using Dapper;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class AttendanceLeaveRequestRepository : IAttendanceLeaveRequestRepository
{
    private readonly StoredProcedureExecutor _executor;

    public AttendanceLeaveRequestRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<AttendanceLeaveRequestDto>> GetListAsync(
        long orgId,
        string? status,
        long? userId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Status", status);
        p.Add("@UserID", userId);
        p.Add("@FromDate", fromDate?.Date);
        p.Add("@ToDate", toDate?.Date);
        return _executor.QueryListAsync<AttendanceLeaveRequestDto>("dbo.sp_AttendanceLeaveRequest_GetList", p, cancellationToken);
    }

    public Task<IReadOnlyList<AttendanceLeaveRequestMyDto>> GetMyAsync(
        long userId,
        long orgId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        p.Add("@OrgID", orgId);
        p.Add("@FromDate", fromDate?.Date);
        p.Add("@ToDate", toDate?.Date);
        return _executor.QueryListAsync<AttendanceLeaveRequestMyDto>("dbo.sp_AttendanceLeaveRequest_GetMy", p, cancellationToken);
    }

    public Task<AttendanceLeaveRequestDto?> GetByIdAsync(long leaveRequestId, long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LeaveRequestID", leaveRequestId);
        p.Add("@OrgID", orgId);
        return _executor.QuerySingleOrDefaultAsync<AttendanceLeaveRequestDto>("dbo.sp_AttendanceLeaveRequest_GetById", p, cancellationToken);
    }

    public async Task<long> ApplyAsync(
        long orgId,
        long userId,
        string leaveType,
        DateTime startDate,
        DateTime endDate,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LeaveRequestID", dbType: DbType.Int64, direction: ParameterDirection.InputOutput, value: null);
        p.Add("@OrgID", orgId);
        p.Add("@UserID", userId);
        p.Add("@LeaveType", leaveType);
        p.Add("@StartDate", startDate.Date);
        p.Add("@EndDate", endDate.Date);
        p.Add("@Reason", reason);
        await _executor.ExecuteAsync("dbo.sp_AttendanceLeaveRequest_Apply", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@LeaveRequestID");
    }

    public Task ReviewAsync(
        long leaveRequestId,
        long orgId,
        long reviewedBy,
        string status,
        string? comment,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LeaveRequestID", leaveRequestId);
        p.Add("@OrgID", orgId);
        p.Add("@ReviewedBy", reviewedBy);
        p.Add("@Status", status);
        p.Add("@ReviewComment", comment);
        return _executor.ExecuteAsync("dbo.sp_AttendanceLeaveRequest_Review", p, cancellationToken);
    }
}
