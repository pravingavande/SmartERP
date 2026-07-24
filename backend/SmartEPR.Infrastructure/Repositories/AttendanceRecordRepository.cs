using Dapper;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class AttendanceRecordRepository : IAttendanceRecordRepository
{
    private readonly StoredProcedureExecutor _executor;

    public AttendanceRecordRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<AttendanceRecordListSourceDto>> GetListAsync(
        long orgId,
        DateTime? fromDate,
        DateTime? toDate,
        long? userId,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@FromDate", fromDate?.Date);
        p.Add("@ToDate", toDate?.Date);
        p.Add("@UserID", userId);
        return _executor.QueryListAsync<AttendanceRecordListSourceDto>("dbo.sp_AttendanceRecord_GetList", p, cancellationToken);
    }

    public Task<AttendanceRecordListSourceDto?> GetByIdAsync(long attendanceId, long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@AttendanceID", attendanceId);
        p.Add("@OrgID", orgId);
        return _executor.QuerySingleOrDefaultAsync<AttendanceRecordListSourceDto>("dbo.sp_AttendanceRecord_GetById", p, cancellationToken);
    }
}
