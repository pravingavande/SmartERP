using System.Text.Json;
using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class AttendanceCorrectionService : IAttendanceCorrectionService
{
    private readonly IAttendanceCorrectionRepository _correctionRepository;
    private readonly IAttendanceRecordRepository _recordRepository;
    private readonly IAttendanceRecordService _recordService;

    public AttendanceCorrectionService(
        IAttendanceCorrectionRepository correctionRepository,
        IAttendanceRecordRepository recordRepository,
        IAttendanceRecordService recordService)
    {
        _correctionRepository = correctionRepository;
        _recordRepository = recordRepository;
        _recordService = recordService;
    }

    public async Task<(AttendanceCorrectionResultDto? Data, string? Error)> ReverseAsync(
        long performedByUserId,
        ReverseAttendanceCorrectionRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.OrgID <= 0 || request.AttendanceID <= 0 || performedByUserId <= 0)
            return (null, "Organization and attendance record are required.");

        var eventType = (request.EventType ?? string.Empty).Trim().ToLowerInvariant();
        if (eventType is not "check_in" and not "check_out")
            return (null, "eventType must be check_in or check_out.");

        var reason = (request.Reason ?? string.Empty).Trim();
        if (reason.Length < 3)
            return (null, "A reason of at least 3 characters is required.");

        var existing = await _recordRepository.GetByIdAsync(request.AttendanceID, request.OrgID, cancellationToken).ConfigureAwait(false);
        if (existing is null)
            return (null, "Attendance record not found.");

        if (eventType == "check_in" && existing.CheckInTime is null)
            return (null, "No check-in to reverse.");

        if (eventType == "check_out" && existing.CheckOutTime is null)
            return (null, "No check-out to reverse.");

        var metaJson = JsonSerializer.Serialize(new
        {
            checkInTime = existing.CheckInTime,
            checkOutTime = existing.CheckOutTime
        });

        try
        {
            await _correctionRepository.ReverseAsync(
                request.AttendanceID,
                request.OrgID,
                eventType,
                performedByUserId,
                reason,
                metaJson,
                cancellationToken).ConfigureAwait(false);

            var updated = await _recordService.GetByIdAsync(request.AttendanceID, request.OrgID, cancellationToken).ConfigureAwait(false);
            return (new AttendanceCorrectionResultDto
            {
                AttendanceID = request.AttendanceID,
                Success = true,
                Record = updated
            }, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(AttendanceCorrectionResultDto? Data, string? Error)> ForceCheckoutAsync(
        long performedByUserId,
        ForceCheckoutAttendanceRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.OrgID <= 0 || request.AttendanceID <= 0 || performedByUserId <= 0)
            return (null, "Organization and attendance record are required.");

        var reason = (request.Reason ?? string.Empty).Trim();
        if (reason.Length < 3)
            return (null, "A reason of at least 3 characters is required.");

        var existing = await _recordRepository.GetByIdAsync(request.AttendanceID, request.OrgID, cancellationToken).ConfigureAwait(false);
        if (existing is null)
            return (null, "Attendance record not found.");

        if (existing.CheckInTime is null)
            return (null, "Employee has not checked in.");

        if (existing.CheckInTime is not null && !existing.CheckInConfirmed)
            return (null, "Check-in is pending confirmation. Confirm check-in before force check-out.");

        if (existing.CheckOutTime is not null)
            return (null, "Employee already has a check-out on this record.");

        var checkoutAt = request.CheckoutAt ?? DateTime.UtcNow;
        var checkInTime = existing.CheckInTime!.Value;
        if (checkoutAt <= checkInTime)
            return (null, "Check-out time must be after check-in time.");

        var metaJson = JsonSerializer.Serialize(new { checkOutTime = checkoutAt });

        try
        {
            await _correctionRepository.ForceCheckoutAsync(
                request.AttendanceID,
                request.OrgID,
                checkoutAt,
                performedByUserId,
                reason,
                metaJson,
                cancellationToken).ConfigureAwait(false);

            var updated = await _recordService.GetByIdAsync(request.AttendanceID, request.OrgID, cancellationToken).ConfigureAwait(false);
            return (new AttendanceCorrectionResultDto
            {
                AttendanceID = request.AttendanceID,
                Success = true,
                Record = updated
            }, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }
}
