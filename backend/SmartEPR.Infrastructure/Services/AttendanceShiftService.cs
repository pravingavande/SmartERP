using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class AttendanceShiftService : IAttendanceShiftService
{
    private readonly IAttendanceShiftRepository _repository;

    public AttendanceShiftService(IAttendanceShiftRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<AttendanceShiftDto>> GetListAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetListAsync(orgId, cancellationToken);

    public Task<AttendanceShiftDto?> GetByIdAsync(long shiftId, long orgId, CancellationToken cancellationToken = default)
        => _repository.GetByIdAsync(shiftId, orgId, cancellationToken);

    public async Task<(AttendanceShiftDto? Data, string? Error)> CreateAsync(
        SaveAttendanceShiftRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreate(request);
        if (validationError is not null)
            return (null, validationError);

        try
        {
            var shift = MapCreate(request);
            var id = await _repository.SaveAsync(shift, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetByIdAsync(id, request.OrgID, cancellationToken).ConfigureAwait(false);
            return (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(AttendanceShiftDto? Data, string? Error)> UpdateAsync(
        long shiftId,
        UpdateAttendanceShiftRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (shiftId <= 0 || request.OrgID <= 0)
            return (null, "Shift and organization are required.");

        var existing = await _repository.GetByIdAsync(shiftId, request.OrgID, cancellationToken).ConfigureAwait(false);
        if (existing is null)
            return (null, "Shift not found.");

        var merged = MergeUpdate(existing, request);
        var nameCodeError = ValidateNameCode(merged.ShiftName, merged.ShiftCode);
        if (nameCodeError is not null)
            return (null, nameCodeError);

        try
        {
            await _repository.SaveAsync(merged, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetByIdAsync(shiftId, request.OrgID, cancellationToken).ConfigureAwait(false);
            return (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(long shiftId, long orgId, CancellationToken cancellationToken = default)
    {
        if (shiftId <= 0 || orgId <= 0)
            return (false, "Shift and organization are required.");

        var existing = await _repository.GetByIdAsync(shiftId, orgId, cancellationToken).ConfigureAwait(false);
        if (existing is null)
            return (false, "Shift not found.");

        try
        {
            await _repository.DeleteAsync(shiftId, orgId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    private static string? ValidateCreate(SaveAttendanceShiftRequestDto request)
    {
        if (request.OrgID <= 0)
            return "Organization is required.";
        return ValidateNameCode(request.ShiftName, request.ShiftCode);
    }

    private static string? ValidateNameCode(string? name, string? code)
    {
        if (string.IsNullOrWhiteSpace(name))
            return "Shift name is required.";
        if (string.IsNullOrWhiteSpace(code))
            return "Shift code is required.";
        return null;
    }

    private static AttendanceShiftDto MapCreate(SaveAttendanceShiftRequestDto request) => new()
    {
        ShiftID = 0,
        OrgID = request.OrgID,
        ShiftName = request.ShiftName.Trim(),
        ShiftCode = request.ShiftCode.Trim().ToUpperInvariant(),
        StartTime = request.StartTime,
        EndTime = request.EndTime,
        GraceMinutes = request.GraceMinutes,
        EarlyCheckinMinutes = request.EarlyCheckinMinutes,
        IsNightShift = request.IsNightShift,
        WorkingDays = string.IsNullOrWhiteSpace(request.WorkingDays) ? "1111100" : request.WorkingDays,
        IsActive = true,
        TimingMode = request.TimingMode == "flexible" ? "flexible" : "fixed",
        RequiredWorkMinutes = request.RequiredWorkMinutes,
        LunchMinutes = request.LunchMinutes,
        FlexWindowStart = request.FlexWindowStart,
        FlexWindowEnd = request.FlexWindowEnd
    };

    private static AttendanceShiftDto MergeUpdate(AttendanceShiftDto existing, UpdateAttendanceShiftRequestDto request) => new()
    {
        ShiftID = existing.ShiftID,
        OrgID = existing.OrgID,
        ShiftName = request.ShiftName?.Trim() ?? existing.ShiftName,
        ShiftCode = (request.ShiftCode?.Trim().ToUpperInvariant()) ?? existing.ShiftCode,
        StartTime = request.StartTime ?? existing.StartTime,
        EndTime = request.EndTime ?? existing.EndTime,
        GraceMinutes = request.GraceMinutes ?? existing.GraceMinutes,
        EarlyCheckinMinutes = request.EarlyCheckinMinutes ?? existing.EarlyCheckinMinutes,
        IsNightShift = request.IsNightShift ?? existing.IsNightShift,
        WorkingDays = request.WorkingDays ?? existing.WorkingDays,
        IsActive = request.IsActive ?? existing.IsActive,
        TimingMode = request.TimingMode == "flexible" ? "flexible" : request.TimingMode == "fixed" ? "fixed" : existing.TimingMode,
        RequiredWorkMinutes = request.RequiredWorkMinutes ?? existing.RequiredWorkMinutes,
        LunchMinutes = request.LunchMinutes ?? existing.LunchMinutes,
        FlexWindowStart = request.FlexWindowStart ?? existing.FlexWindowStart,
        FlexWindowEnd = request.FlexWindowEnd ?? existing.FlexWindowEnd
    };
}
