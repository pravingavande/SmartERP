using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Infrastructure.Attendance;

public sealed class AttendanceShiftHoursInput
{
    public string StartTime { get; init; } = "09:00";
    public string EndTime { get; init; } = "18:00";
    public bool IsNightShift { get; init; }
    public string WorkingDays { get; init; } = "1111100";
    public string TimingMode { get; init; } = "fixed";
    public int? RequiredWorkMinutes { get; init; }
    public int LunchMinutes { get; init; } = 60;
}

public sealed class AttendanceDayHoursMetrics
{
    public decimal TotalHours { get; init; }
    public decimal NetHours { get; init; }
    public decimal ShortfallHours { get; init; }
    public bool IsDayComplete { get; init; }
    public bool IsWorkingDay { get; init; }
    public bool HasCheckedOut { get; init; }
    public string TimingMode { get; init; } = "fixed";
}

public static class AttendanceHoursHelper
{
    public static AttendanceDayHoursMetrics ComputeDayMetrics(
        DateTime attendanceDate,
        DateTime? checkInTime,
        DateTime? checkOutTime,
        AttendanceShiftHoursInput? shift,
        bool isWorkingDay,
        DateTime? asOf = null)
    {
        var now = asOf ?? DateTime.UtcNow;
        var requiredMin = RequiredWorkMinutes(shift);
        var lunchMin = Math.Max(0, shift?.LunchMinutes ?? 60);
        var expectedHours = RoundHours(requiredMin / 60m);
        var timingMode = shift?.TimingMode == "flexible" ? "flexible" : "fixed";

        if (checkInTime is null)
        {
            return new AttendanceDayHoursMetrics
            {
                TotalHours = 0,
                NetHours = 0,
                ShortfallHours = isWorkingDay ? expectedHours : 0,
                IsDayComplete = false,
                IsWorkingDay = isWorkingDay,
                HasCheckedOut = false,
                TimingMode = timingMode
            };
        }

        var grossMin = WorkedMinutes(checkInTime.Value, checkOutTime, now);
        var totalHours = RoundHours(grossMin / 60m);
        var hasCheckedOut = checkOutTime.HasValue;
        var netMin = hasCheckedOut ? Math.Max(0, grossMin - lunchMin) : grossMin;
        var netHours = RoundHours(netMin / 60m);

        if (!isWorkingDay)
        {
            return new AttendanceDayHoursMetrics
            {
                TotalHours = totalHours,
                NetHours = netHours,
                ShortfallHours = 0,
                IsDayComplete = hasCheckedOut,
                IsWorkingDay = false,
                HasCheckedOut = hasCheckedOut,
                TimingMode = timingMode
            };
        }

        var shortfallMin = hasCheckedOut ? Math.Max(0, requiredMin - netMin) : 0;
        var shortfallHours = RoundHours(shortfallMin / 60m);
        var isDayComplete = hasCheckedOut && shortfallMin == 0;

        return new AttendanceDayHoursMetrics
        {
            TotalHours = totalHours,
            NetHours = netHours,
            ShortfallHours = shortfallHours,
            IsDayComplete = isDayComplete,
            IsWorkingDay = true,
            HasCheckedOut = hasCheckedOut,
            TimingMode = timingMode
        };
    }

    public static AttendanceShiftHoursInput? ToHoursInput(AttendanceShiftDto? shift)
    {
        if (shift is null)
            return null;

        return new AttendanceShiftHoursInput
        {
            StartTime = shift.StartTime,
            EndTime = shift.EndTime,
            IsNightShift = shift.IsNightShift,
            WorkingDays = shift.WorkingDays,
            TimingMode = shift.TimingMode,
            RequiredWorkMinutes = shift.RequiredWorkMinutes,
            LunchMinutes = shift.LunchMinutes
        };
    }

    private static int RequiredWorkMinutes(AttendanceShiftHoursInput? shift)
    {
        if (shift?.RequiredWorkMinutes is > 0)
            return shift.RequiredWorkMinutes.Value;

        return ExpectedShiftMinutes(shift);
    }

    private static int ExpectedShiftMinutes(AttendanceShiftHoursInput? shift)
    {
        if (shift is null || string.IsNullOrWhiteSpace(shift.StartTime) || string.IsNullOrWhiteSpace(shift.EndTime))
            return 8 * 60;

        var start = ParseHmToMinutes(shift.StartTime);
        var end = ParseHmToMinutes(shift.EndTime);
        if (shift.IsNightShift)
            end += 24 * 60;

        return Math.Max(0, end - start);
    }

    private static int WorkedMinutes(DateTime checkIn, DateTime? checkOut, DateTime asOf)
    {
        var end = checkOut ?? asOf;
        var ms = end - checkIn;
        return ms.TotalMinutes < 0 ? 0 : (int)Math.Floor(ms.TotalMinutes);
    }

    private static int ParseHmToMinutes(string value)
    {
        var parts = value.Split(':');
        var hour = parts.Length > 0 && int.TryParse(parts[0], out var h) ? h : 0;
        var minute = parts.Length > 1 && int.TryParse(parts[1], out var m) ? m : 0;
        return hour * 60 + minute;
    }

    private static decimal RoundHours(decimal hours) => Math.Round(hours, 2, MidpointRounding.AwayFromZero);
}
