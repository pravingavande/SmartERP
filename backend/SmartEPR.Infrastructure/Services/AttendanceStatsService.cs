using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Attendance;

namespace SmartEPR.Infrastructure.Services;

public sealed class AttendanceStatsService : IAttendanceStatsService
{
    private static readonly TimeZoneInfo Ist = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

    private readonly IAttendancePayrollRepository _payrollRepository;
    private readonly IAttendanceShiftRepository _shiftRepository;
    private readonly IAttendanceRecordRepository _recordRepository;
    private readonly IAttendanceMonthlyOffRepository _monthlyOffRepository;

    public AttendanceStatsService(
        IAttendancePayrollRepository payrollRepository,
        IAttendanceShiftRepository shiftRepository,
        IAttendanceRecordRepository recordRepository,
        IAttendanceMonthlyOffRepository monthlyOffRepository)
    {
        _payrollRepository = payrollRepository;
        _shiftRepository = shiftRepository;
        _recordRepository = recordRepository;
        _monthlyOffRepository = monthlyOffRepository;
    }

    public async Task<AttendanceStatsDto> GetStatsAsync(long orgId, DateTime? date, CancellationToken cancellationToken = default)
    {
        if (orgId <= 0)
            return EmptyStats();

        var statsDate = (date ?? TodayIst()).Date;

        var employeesTask = _payrollRepository.GetEmployeesAsync(orgId, cancellationToken);
        var shiftsTask = _shiftRepository.GetListAsync(orgId, cancellationToken);
        var recordsTask = _recordRepository.GetListAsync(orgId, statsDate, statsDate, null, cancellationToken);
        var leavesTask = _payrollRepository.GetApprovedLeavesAsync(orgId, statsDate, statsDate, cancellationToken);
        var overridesTask = _monthlyOffRepository.GetOverridesAsync(orgId, statsDate, statsDate, cancellationToken);

        await Task.WhenAll(employeesTask, shiftsTask, recordsTask, leavesTask, overridesTask).ConfigureAwait(false);

        var employees = await employeesTask.ConfigureAwait(false);
        var shifts = await shiftsTask.ConfigureAwait(false);
        var records = await recordsTask.ConfigureAwait(false);
        var leaves = await leavesTask.ConfigureAwait(false);
        var overrides = await overridesTask.ConfigureAwait(false);

        var shiftById = shifts.ToDictionary(s => s.ShiftID);
        var defaultShift = shifts.FirstOrDefault(s => s.IsActive && s.ShiftCode == "GENERAL")
            ?? shifts.FirstOrDefault(s => s.IsActive);
        var overrideMap = overrides.ToDictionary(o => $"{o.UserID}|{o.WorkDate:yyyy-MM-dd}", o => o.IsOff);
        var leaveUserIds = leaves
            .Where(l => l.StartDate.Date <= statsDate && l.EndDate.Date >= statsDate)
            .Select(l => l.UserID)
            .ToHashSet();

        var workingEmployees = employees.Where(emp =>
        {
            var shift = ResolveShift(emp.AttendanceShiftID, shiftById, defaultShift);
            var dateKey = $"{emp.UserID}|{statsDate:yyyy-MM-dd}";
            if (overrideMap.TryGetValue(dateKey, out var forcedOff))
                return !forcedOff;

            return AttendanceWeeklyOffHelper.IsEmployeeWorkingDay(
                statsDate,
                emp.WeeklyOffDays,
                emp.SaturdayOffPattern,
                shift?.WorkingDays ?? "1111100");
        }).ToList();

        var workingIds = workingEmployees.Select(e => e.UserID).ToHashSet();
        var presentUserIds = new HashSet<long>();
        var lateCount = 0;
        var pendingConfirmations = 0;

        foreach (var record in records)
        {
            if (record.CheckInTime.HasValue && !record.CheckInConfirmed)
                pendingConfirmations++;
            if (record.CheckOutTime.HasValue && !record.CheckOutConfirmed)
                pendingConfirmations++;

            if (!record.CheckInTime.HasValue || !record.CheckInConfirmed || !workingIds.Contains(record.UserID))
                continue;

            presentUserIds.Add(record.UserID);
            var employee = workingEmployees.FirstOrDefault(e => e.UserID == record.UserID);
            var shift = ResolveShift(employee?.AttendanceShiftID ?? record.AttendanceShiftID, shiftById, defaultShift);
            if (IsLateCheckIn(record.CheckInTime.Value, shift))
                lateCount++;
        }

        var absentCount = workingEmployees.Count(emp =>
            !presentUserIds.Contains(emp.UserID) && !leaveUserIds.Contains(emp.UserID));

        return new AttendanceStatsDto
        {
            TotalEmployees = workingEmployees.Count,
            TodayAttendance = presentUserIds.Count,
            LateCheckIns = lateCount,
            AbsentEmployees = absentCount,
            LeaveCount = workingEmployees.Count(emp => leaveUserIds.Contains(emp.UserID)),
            WeekOffCount = Math.Max(0, employees.Count - workingEmployees.Count),
            PendingConfirmations = pendingConfirmations
        };
    }

    private static AttendanceShiftDto? ResolveShift(
        long? shiftId,
        IReadOnlyDictionary<long, AttendanceShiftDto> shiftById,
        AttendanceShiftDto? defaultShift)
    {
        if (shiftId is > 0 && shiftById.TryGetValue(shiftId.Value, out var shift))
            return shift;

        return defaultShift;
    }

    private static bool IsLateCheckIn(DateTime checkInTime, AttendanceShiftDto? shift)
    {
        if (shift is null || string.IsNullOrWhiteSpace(shift.StartTime))
            return false;

        var ist = TimeZoneInfo.ConvertTimeFromUtc(
            checkInTime.Kind == DateTimeKind.Utc ? checkInTime : checkInTime.ToUniversalTime(),
            Ist);
        var checkMinutes = ist.Hour * 60 + ist.Minute;
        var allowedMinutes = ParseHmToMinutes(shift.StartTime) + Math.Max(0, shift.GraceMinutes);
        return checkMinutes > allowedMinutes;
    }

    private static int ParseHmToMinutes(string value)
    {
        var parts = value.Split(':');
        var hour = parts.Length > 0 && int.TryParse(parts[0], out var h) ? h : 0;
        var minute = parts.Length > 1 && int.TryParse(parts[1], out var m) ? m : 0;
        return hour * 60 + minute;
    }

    private static DateTime TodayIst()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist).Date;
    }

    private static AttendanceStatsDto EmptyStats() => new();
}
