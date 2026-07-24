using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Attendance;

namespace SmartEPR.Infrastructure.Services;

public sealed class AttendanceRecordService : IAttendanceRecordService
{
    private readonly IAttendanceRecordRepository _recordRepository;
    private readonly IAttendanceShiftRepository _shiftRepository;
    private readonly IAttendanceMonthlyOffRepository _monthlyOffRepository;

    public AttendanceRecordService(
        IAttendanceRecordRepository recordRepository,
        IAttendanceShiftRepository shiftRepository,
        IAttendanceMonthlyOffRepository monthlyOffRepository)
    {
        _recordRepository = recordRepository;
        _shiftRepository = shiftRepository;
        _monthlyOffRepository = monthlyOffRepository;
    }

    public async Task<IReadOnlyList<AttendanceRecordDto>> GetListAsync(
        long orgId,
        DateTime? fromDate,
        DateTime? toDate,
        long? userId,
        CancellationToken cancellationToken = default)
    {
        if (orgId <= 0)
            return [];

        var rows = await _recordRepository.GetListAsync(orgId, fromDate, toDate, userId, cancellationToken).ConfigureAwait(false);
        if (rows.Count == 0)
            return [];

        var shifts = await _shiftRepository.GetListAsync(orgId, cancellationToken).ConfigureAwait(false);
        var shiftById = shifts.ToDictionary(s => s.ShiftID);
        var defaultShift = shifts.FirstOrDefault(s => s.IsActive && s.ShiftCode == "GENERAL")
            ?? shifts.FirstOrDefault(s => s.IsActive);

        var rangeFrom = fromDate?.Date ?? rows.Min(r => r.AttendanceDate.Date);
        var rangeTo = toDate?.Date ?? rows.Max(r => r.AttendanceDate.Date);
        var overrides = await _monthlyOffRepository.GetOverridesAsync(orgId, rangeFrom, rangeTo, cancellationToken).ConfigureAwait(false);
        var overrideMap = overrides.ToDictionary(o => $"{o.UserID}|{o.WorkDate:yyyy-MM-dd}", o => o.IsOff);

        return rows.Select(row => MapRow(row, shiftById, defaultShift, overrideMap)).ToList();
    }

    public async Task<AttendanceRecordDto?> GetByIdAsync(long attendanceId, long orgId, CancellationToken cancellationToken = default)
    {
        if (attendanceId <= 0 || orgId <= 0)
            return null;

        var row = await _recordRepository.GetByIdAsync(attendanceId, orgId, cancellationToken).ConfigureAwait(false);
        if (row is null)
            return null;

        var shifts = await _shiftRepository.GetListAsync(orgId, cancellationToken).ConfigureAwait(false);
        var shiftById = shifts.ToDictionary(s => s.ShiftID);
        var defaultShift = shifts.FirstOrDefault(s => s.IsActive && s.ShiftCode == "GENERAL")
            ?? shifts.FirstOrDefault(s => s.IsActive);

        var overrides = await _monthlyOffRepository.GetOverridesAsync(
            orgId,
            row.AttendanceDate.Date,
            row.AttendanceDate.Date,
            cancellationToken).ConfigureAwait(false);
        var overrideMap = overrides.ToDictionary(o => $"{o.UserID}|{o.WorkDate:yyyy-MM-dd}", o => o.IsOff);

        return MapRow(row, shiftById, defaultShift, overrideMap);
    }

    private static AttendanceRecordDto MapRow(
        AttendanceRecordListSourceDto row,
        IReadOnlyDictionary<long, AttendanceShiftDto> shiftById,
        AttendanceShiftDto? defaultShift,
        IReadOnlyDictionary<string, bool> overrideMap)
    {
        var shift = row.AttendanceShiftID is > 0 && shiftById.TryGetValue(row.AttendanceShiftID.Value, out var assigned)
            ? assigned
            : defaultShift;

        var shiftWorkingDays = shift?.WorkingDays ?? "1111100";
        var dateObj = AttendanceWeeklyOffHelper.ParseIstDate(row.AttendanceDate.ToString("yyyy-MM-dd"));
        var dateKey = $"{row.UserID}|{row.AttendanceDate:yyyy-MM-dd}";

        var isWorkingDay = overrideMap.TryGetValue(dateKey, out var forcedOff)
            ? !forcedOff
            : AttendanceWeeklyOffHelper.IsEmployeeWorkingDay(dateObj, row.WeeklyOffDays, row.SaturdayOffPattern, shiftWorkingDays);

        var effectiveCheckIn = row.CheckInTime.HasValue && row.CheckInConfirmed;
        var effectiveCheckOut = row.CheckOutTime.HasValue && row.CheckOutConfirmed;
        var metrics = AttendanceHoursHelper.ComputeDayMetrics(
            row.AttendanceDate,
            effectiveCheckIn ? row.CheckInTime : null,
            effectiveCheckOut ? row.CheckOutTime : null,
            AttendanceHoursHelper.ToHoursInput(shift),
            isWorkingDay);

        return new AttendanceRecordDto
        {
            AttendanceID = row.AttendanceID,
            OrgID = row.OrgID,
            UserID = row.UserID,
            UserName = row.UserName,
            EmployeeCode = row.EmployeeCode,
            AttendanceDate = row.AttendanceDate,
            CheckInTime = row.CheckInTime,
            CheckOutTime = row.CheckOutTime,
            CheckInLatitude = row.CheckInLatitude,
            CheckInLongitude = row.CheckInLongitude,
            CheckOutLatitude = row.CheckOutLatitude,
            CheckOutLongitude = row.CheckOutLongitude,
            CheckInPhotoPath = row.CheckInPhotoPath,
            CheckOutPhotoPath = row.CheckOutPhotoPath,
            CheckInMethod = row.CheckInMethod,
            CheckOutMethod = row.CheckOutMethod,
            OfficeName = row.OfficeName,
            CheckInConfirmed = row.CheckInConfirmed,
            CheckOutConfirmed = row.CheckOutConfirmed,
            CheckInPendingConfirmation = row.CheckInTime.HasValue && !row.CheckInConfirmed,
            CheckOutPendingConfirmation = row.CheckOutTime.HasValue && !row.CheckOutConfirmed,
            TotalHours = metrics.TotalHours,
            NetHours = metrics.NetHours,
            ShortfallHours = metrics.ShortfallHours,
            IsDayComplete = metrics.IsDayComplete,
            IsWorkingDay = metrics.IsWorkingDay,
            HasCheckedOut = metrics.HasCheckedOut,
            TimingMode = metrics.TimingMode
        };
    }
}
