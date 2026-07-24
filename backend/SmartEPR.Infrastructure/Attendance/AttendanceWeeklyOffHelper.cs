namespace SmartEPR.Infrastructure.Attendance;

public static class AttendanceWeeklyOffHelper
{
    private static readonly TimeZoneInfo Ist = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
    private static readonly string[] DayLetters = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    public static IReadOnlyList<string> ListDatesInMonth(int year, int month)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var dates = new List<string>(daysInMonth);
        for (var day = 1; day <= daysInMonth; day++)
        {
            dates.Add($"{year:D4}-{month:D2}-{day:D2}");
        }

        return dates;
    }

    public static string MonthLabel(int year, int month)
    {
        var date = new DateTime(year, month, 1, 12, 0, 0, DateTimeKind.Unspecified);
        var ist = TimeZoneInfo.ConvertTimeToUtc(date, Ist);
        return TimeZoneInfo.ConvertTimeFromUtc(ist, Ist).ToString("MMMM yyyy", System.Globalization.CultureInfo.GetCultureInfo("en-IN"));
    }

    public static int DayOfWeekIst(DateTime date)
    {
        var ist = TimeZoneInfo.ConvertTime(date, Ist);
        return (int)ist.DayOfWeek;
    }

    public static string WeekdayLabel(DateTime date) => DayLetters[DayOfWeekIst(date)];

    public static bool IsWorkingDayIst(DateTime date, string workingDays)
    {
        if (string.IsNullOrEmpty(workingDays) || workingDays.Length != 7)
            return true;

        var jsDay = DayOfWeekIst(date);
        var index = jsDay == 0 ? 6 : jsDay - 1;
        return workingDays[index] == '1';
    }

    public static string EffectiveWeeklyOffDays(string? userWeeklyOffDays, string shiftWorkingDays)
    {
        if (!string.IsNullOrWhiteSpace(userWeeklyOffDays) && userWeeklyOffDays.Length == 7)
            return userWeeklyOffDays;

        return shiftWorkingDays.Length == 7 ? shiftWorkingDays : "1111100";
    }

    public static bool IsEmployeeWorkingDay(
        DateTime date,
        string? weeklyOffDays,
        string? saturdayOffPattern,
        string shiftWorkingDays)
    {
        var satOff = IsSaturdayOffByPattern(date, saturdayOffPattern);
        if (satOff.HasValue)
            return !satOff.Value;

        var workingDays = EffectiveWeeklyOffDays(weeklyOffDays, shiftWorkingDays);
        return IsWorkingDayIst(date, workingDays);
    }

    private static bool? IsSaturdayOffByPattern(DateTime date, string? pattern)
    {
        if (DayOfWeekIst(date) != 6)
            return null;

        var normalized = NormalizeSaturdayOffPattern(pattern);
        var nth = WhichSaturdayOfMonth(date);
        return normalized switch
        {
            "all_off" => true,
            "all_working" => false,
            "second_fourth" => nth is 2 or 4,
            "first_third" => nth is 1 or 3,
            "first_third_fifth" => nth is 1 or 3 or 5,
            _ => null
        };
    }

    private static string NormalizeSaturdayOffPattern(string? pattern)
    {
        var value = (pattern ?? "none").Trim().ToLowerInvariant();
        return value is "all_off" or "all_working" or "second_fourth" or "first_third" or "first_third_fifth"
            ? value
            : "none";
    }

    private static int WhichSaturdayOfMonth(DateTime date)
    {
        var ist = TimeZoneInfo.ConvertTime(date, Ist);
        var year = ist.Year;
        var month = ist.Month;
        var day = ist.Day;
        var count = 0;
        for (var dom = 1; dom <= day; dom++)
        {
            var probe = new DateTime(year, month, dom, 12, 0, 0, DateTimeKind.Unspecified);
            if (DayOfWeekIst(probe) == 6)
                count++;
        }

        return count;
    }

    public static DateTime ParseIstDate(string date)
    {
        var parts = date.Split('-', StringSplitOptions.RemoveEmptyEntries);
        var year = int.Parse(parts[0]);
        var month = int.Parse(parts[1]);
        var day = int.Parse(parts[2]);
        return new DateTime(year, month, day, 12, 0, 0, DateTimeKind.Unspecified);
    }
}
