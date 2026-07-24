using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Core.Interfaces;

public interface IAttendanceCorrectionRepository
{
    Task ReverseAsync(
        long attendanceId,
        long orgId,
        string eventType,
        long performedBy,
        string reason,
        string? metaJson,
        CancellationToken cancellationToken = default);

    Task ForceCheckoutAsync(
        long attendanceId,
        long orgId,
        DateTime checkoutAt,
        long performedBy,
        string reason,
        string? metaJson,
        CancellationToken cancellationToken = default);
}

public interface IAttendanceCorrectionService
{
    Task<(AttendanceCorrectionResultDto? Data, string? Error)> ReverseAsync(
        long performedByUserId,
        ReverseAttendanceCorrectionRequestDto request,
        CancellationToken cancellationToken = default);

    Task<(AttendanceCorrectionResultDto? Data, string? Error)> ForceCheckoutAsync(
        long performedByUserId,
        ForceCheckoutAttendanceRequestDto request,
        CancellationToken cancellationToken = default);
}
