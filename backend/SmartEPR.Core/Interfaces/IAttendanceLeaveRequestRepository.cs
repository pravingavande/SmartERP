using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Core.Interfaces;

public interface IAttendanceLeaveRequestRepository
{
    Task<IReadOnlyList<AttendanceLeaveRequestDto>> GetListAsync(
        long orgId,
        string? status,
        long? userId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AttendanceLeaveRequestMyDto>> GetMyAsync(
        long userId,
        long orgId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default);

    Task<AttendanceLeaveRequestDto?> GetByIdAsync(long leaveRequestId, long orgId, CancellationToken cancellationToken = default);

    Task<long> ApplyAsync(long orgId, long userId, string leaveType, DateTime startDate, DateTime endDate, string? reason, CancellationToken cancellationToken = default);

    Task ReviewAsync(long leaveRequestId, long orgId, long reviewedBy, string status, string? comment, CancellationToken cancellationToken = default);
}

public interface IAttendanceLeaveRequestService
{
    Task<IReadOnlyList<AttendanceLeaveRequestDto>> GetListAsync(
        long orgId,
        string? status,
        long? userId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AttendanceLeaveRequestMyDto>> GetMyAsync(
        long userId,
        long orgId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default);

    Task<(AttendanceLeaveRequestDto? Data, string? Error)> ApplyAsync(long userId, ApplyAttendanceLeaveRequestDto request, CancellationToken cancellationToken = default);

    Task<(AttendanceLeaveRequestReviewResultDto? Data, string? Error)> ReviewAsync(
        long leaveRequestId,
        long reviewerUserId,
        ReviewAttendanceLeaveRequestDto request,
        CancellationToken cancellationToken = default);
}
