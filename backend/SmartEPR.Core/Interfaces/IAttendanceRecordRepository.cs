using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Core.Interfaces;

public interface IAttendanceRecordRepository
{
    Task<IReadOnlyList<AttendanceRecordListSourceDto>> GetListAsync(
        long orgId,
        DateTime? fromDate,
        DateTime? toDate,
        long? userId,
        CancellationToken cancellationToken = default);

    Task<AttendanceRecordListSourceDto?> GetByIdAsync(long attendanceId, long orgId, CancellationToken cancellationToken = default);
}

public interface IAttendanceRecordService
{
    Task<IReadOnlyList<AttendanceRecordDto>> GetListAsync(
        long orgId,
        DateTime? fromDate,
        DateTime? toDate,
        long? userId,
        CancellationToken cancellationToken = default);

    Task<AttendanceRecordDto?> GetByIdAsync(long attendanceId, long orgId, CancellationToken cancellationToken = default);
}
