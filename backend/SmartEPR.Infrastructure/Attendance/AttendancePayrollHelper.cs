using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Infrastructure.Attendance;

public sealed class AttendancePayrollDayCounts
{
    public int Year { get; init; }
    public int Month { get; init; }
    public string MonthLabel { get; init; } = string.Empty;
    public int WorkingDaysInMonth { get; init; }
    public int WeeklyOffDays { get; init; }
    public int PresentDays { get; init; }
    public int LeaveDays { get; init; }
    public int AbsentDays { get; init; }
    public int PendingDays { get; init; }
    public int DaysElapsedInMonth { get; init; }
}

public sealed class AttendancePayrollAmounts
{
    public decimal MonthlySalary { get; init; }
    public decimal PerDayRate { get; init; }
    public decimal EarnedSoFar { get; init; }
    public decimal DeductionForAbsences { get; init; }
    public decimal ProjectedNetSalary { get; init; }
    public decimal MaxPossibleRemaining { get; init; }
    public decimal PayableSalary { get; init; }
    public int PaidDays { get; init; }
}

public static class AttendancePayrollHelper
{
    private static readonly TimeZoneInfo Ist = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
    private static readonly string[] WeekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    public static string TodayIst()
    {
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);
        return now.ToString("yyyy-MM-dd");
    }

    public static (int Year, int Month) ParseYearMonth(int year, int month)
    {
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);
        var y = year is >= 2020 and <= 2100 ? year : now.Year;
        var m = month is >= 1 and <= 12 ? month : now.Month;
        return (y, m);
    }

    public static AttendancePayrollDayCounts ComputeDayCounts(
        int year,
        int month,
        Func<string, DateTime, bool> isWorkingDay,
        IReadOnlySet<string> presentDates,
        IReadOnlySet<string> approvedLeaveDates,
        string? asOfDate = null)
    {
        var asOf = asOfDate ?? TodayIst();
        var counts = new AttendancePayrollDayCounts
        {
            Year = year,
            Month = month,
            MonthLabel = AttendanceWeeklyOffHelper.MonthLabel(year, month)
        };

        var workingDays = 0;
        var weeklyOffDays = 0;
        var presentDays = 0;
        var leaveDays = 0;
        var absentDays = 0;
        var pendingDays = 0;
        var daysElapsed = 0;

        foreach (var dateStr in AttendanceWeeklyOffHelper.ListDatesInMonth(year, month))
        {
            if (string.CompareOrdinal(dateStr, asOf) <= 0)
                daysElapsed++;

            var dateObj = AttendanceWeeklyOffHelper.ParseIstDate(dateStr);
            if (!isWorkingDay(dateStr, dateObj))
            {
                weeklyOffDays++;
                continue;
            }

            workingDays++;
            if (approvedLeaveDates.Contains(dateStr))
            {
                leaveDays++;
                continue;
            }

            if (presentDates.Contains(dateStr))
                presentDays++;
            else if (string.CompareOrdinal(dateStr, asOf) > 0)
                pendingDays++;
            else
                absentDays++;
        }

        return new AttendancePayrollDayCounts
        {
            Year = year,
            Month = month,
            MonthLabel = AttendanceWeeklyOffHelper.MonthLabel(year, month),
            WorkingDaysInMonth = workingDays,
            WeeklyOffDays = weeklyOffDays,
            PresentDays = presentDays,
            LeaveDays = leaveDays,
            AbsentDays = absentDays,
            PendingDays = pendingDays,
            DaysElapsedInMonth = daysElapsed
        };
    }

    public static AttendancePayrollAmounts ComputeAmounts(decimal monthlySalary, AttendancePayrollDayCounts counts)
    {
        var salary = Math.Max(0, monthlySalary);
        var perDayRate = counts.WorkingDaysInMonth > 0
            ? Math.Round(salary / counts.WorkingDaysInMonth, 2, MidpointRounding.AwayFromZero)
            : 0;
        var paidDays = counts.PresentDays + counts.LeaveDays;
        var earnedSoFar = Math.Round(perDayRate * paidDays, 2, MidpointRounding.AwayFromZero);
        var deductionForAbsences = Math.Round(perDayRate * counts.AbsentDays, 2, MidpointRounding.AwayFromZero);
        var projectedNetSalary = Math.Round(salary - deductionForAbsences, 2, MidpointRounding.AwayFromZero);
        var maxPossibleRemaining = counts.PendingDays > 0
            ? Math.Round(perDayRate * counts.PendingDays, 2, MidpointRounding.AwayFromZero)
            : 0;

        return new AttendancePayrollAmounts
        {
            MonthlySalary = salary,
            PerDayRate = perDayRate,
            EarnedSoFar = earnedSoFar,
            DeductionForAbsences = deductionForAbsences,
            ProjectedNetSalary = projectedNetSalary,
            MaxPossibleRemaining = maxPossibleRemaining,
            PayableSalary = earnedSoFar,
            PaidDays = paidDays
        };
    }

    public static HashSet<string> ExpandLeaveDates(
        IEnumerable<AttendancePayrollApprovedLeaveDto> leaves,
        string fromDate,
        string toDate)
    {
        var dates = new HashSet<string>(StringComparer.Ordinal);
        foreach (var leave in leaves)
        {
            var start = leave.StartDate.Date;
            var end = leave.EndDate.Date;
            var clipStart = string.CompareOrdinal(start.ToString("yyyy-MM-dd"), fromDate) < 0
                ? DateTime.Parse(fromDate)
                : start;
            var clipEnd = string.CompareOrdinal(end.ToString("yyyy-MM-dd"), toDate) > 0
                ? DateTime.Parse(toDate)
                : end;

            for (var day = clipStart; day <= clipEnd; day = day.AddDays(1))
                dates.Add(day.ToString("yyyy-MM-dd"));
        }

        return dates;
    }

    public static string WeeklyOffDaysLabel(string workingDays)
    {
        if (workingDays.Length != 7)
            return "No weekly off";

        var off = new List<string>();
        for (var i = 0; i < 7; i++)
        {
            if (workingDays[i] == '0')
                off.Add(WeekdayLabels[i]);
        }

        return off.Count == 0 ? "No weekly off" : string.Join(", ", off);
    }

    public static string SaturdayOffPatternLabel(string? pattern)
    {
        return (pattern ?? "none").Trim().ToLowerInvariant() switch
        {
            "all_off" => "All Saturdays off",
            "all_working" => "All Saturdays working",
            "second_fourth" => "2nd & 4th Saturday off",
            "first_third" => "1st & 3rd Saturday off",
            "first_third_fifth" => "1st, 3rd & 5th Saturday off",
            _ => "Follow weekly schedule"
        };
    }
}
