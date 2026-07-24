using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class AttendanceLeaveRequestService : IAttendanceLeaveRequestService
{
    private static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "casual", "sick", "earned", "other"
    };

    private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "pending", "approved", "rejected"
    };

    private readonly IAttendanceLeaveRequestRepository _repository;

    public AttendanceLeaveRequestService(IAttendanceLeaveRequestRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<AttendanceLeaveRequestDto>> GetListAsync(
        long orgId,
        string? status,
        long? userId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        if (orgId <= 0)
            return Task.FromResult<IReadOnlyList<AttendanceLeaveRequestDto>>([]);

        var normalizedStatus = NormalizeFilterStatus(status);
        return _repository.GetListAsync(orgId, normalizedStatus, userId, fromDate, toDate, cancellationToken);
    }

    public Task<IReadOnlyList<AttendanceLeaveRequestMyDto>> GetMyAsync(
        long userId,
        long orgId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        if (userId <= 0 || orgId <= 0)
            return Task.FromResult<IReadOnlyList<AttendanceLeaveRequestMyDto>>([]);

        return _repository.GetMyAsync(userId, orgId, fromDate, toDate, cancellationToken);
    }

    public async Task<(AttendanceLeaveRequestDto? Data, string? Error)> ApplyAsync(
        long userId,
        ApplyAttendanceLeaveRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (userId <= 0 || request.OrgID <= 0)
            return (null, "Organization is required.");

        var leaveType = (request.Type ?? string.Empty).Trim().ToLowerInvariant();
        if (!ValidTypes.Contains(leaveType))
            return (null, "Invalid leave type. Use: casual, sick, earned, other.");

        if (!TryParseDate(request.StartDate, out var startDate))
            return (null, "startDate is required (YYYY-MM-DD).");

        if (!TryParseDate(request.EndDate, out var endDate))
            return (null, "endDate is required (YYYY-MM-DD).");

        if (endDate < startDate)
            return (null, "endDate must be on or after startDate.");

        try
        {
            var id = await _repository.ApplyAsync(
                request.OrgID,
                userId,
                leaveType,
                startDate,
                endDate,
                string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
                cancellationToken).ConfigureAwait(false);

            var saved = await _repository.GetByIdAsync(id, request.OrgID, cancellationToken).ConfigureAwait(false);
            return (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(AttendanceLeaveRequestReviewResultDto? Data, string? Error)> ReviewAsync(
        long leaveRequestId,
        long reviewerUserId,
        ReviewAttendanceLeaveRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (leaveRequestId <= 0 || request.OrgID <= 0 || reviewerUserId <= 0)
            return (null, "Leave request and organization are required.");

        var status = (request.Status ?? string.Empty).Trim().ToLowerInvariant();
        if (status is not "approved" and not "rejected")
            return (null, "status must be approved or rejected.");

        try
        {
            await _repository.ReviewAsync(
                leaveRequestId,
                request.OrgID,
                reviewerUserId,
                status,
                string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
                cancellationToken).ConfigureAwait(false);

            var saved = await _repository.GetByIdAsync(leaveRequestId, request.OrgID, cancellationToken).ConfigureAwait(false);
            if (saved is null)
                return (null, "Leave request not found.");

            return (new AttendanceLeaveRequestReviewResultDto
            {
                LeaveRequestID = saved.LeaveRequestID,
                Status = saved.Status,
                ReviewedAt = saved.ReviewedAt,
                ReviewComment = saved.ReviewComment
            }, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    private static string? NormalizeFilterStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return null;

        var normalized = status.Trim().ToLowerInvariant();
        return ValidStatuses.Contains(normalized) ? normalized : null;
    }

    private static bool TryParseDate(string? value, out DateTime date)
    {
        date = default;
        if (string.IsNullOrWhiteSpace(value))
            return false;

        return DateTime.TryParseExact(
            value.Trim(),
            "yyyy-MM-dd",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None,
            out date);
    }
}
