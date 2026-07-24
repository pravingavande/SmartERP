using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Infrastructure.Attendance;
using Xunit;

namespace SmartEPR.Tests.Attendance;

public sealed class AttendanceWeeklyOffHelperTests
{
    [Fact]
    public void ListDatesInMonth_July2026_Returns31Dates()
    {
        var dates = AttendanceWeeklyOffHelper.ListDatesInMonth(2026, 7);

        Assert.Equal(31, dates.Count);
        Assert.Equal("2026-07-01", dates[0]);
        Assert.Equal("2026-07-31", dates[^1]);
    }

    [Fact]
    public void ListDatesInMonth_February2024_Returns29Dates()
    {
        var dates = AttendanceWeeklyOffHelper.ListDatesInMonth(2024, 2);

        Assert.Equal(29, dates.Count);
    }

    [Fact]
    public void IsWorkingDayIst_MondayToFridayWorking_SaturdaySundayOff()
    {
        const string workingDays = "1111100";
        var monday = AttendanceWeeklyOffHelper.ParseIstDate("2026-07-20");
        var saturday = AttendanceWeeklyOffHelper.ParseIstDate("2026-07-25");
        var sunday = AttendanceWeeklyOffHelper.ParseIstDate("2026-07-26");

        Assert.True(AttendanceWeeklyOffHelper.IsWorkingDayIst(monday, workingDays));
        Assert.False(AttendanceWeeklyOffHelper.IsWorkingDayIst(saturday, workingDays));
        Assert.False(AttendanceWeeklyOffHelper.IsWorkingDayIst(sunday, workingDays));
    }

    [Fact]
    public void EffectiveWeeklyOffDays_UsesUserOverrideWhenPresent()
    {
        var result = AttendanceWeeklyOffHelper.EffectiveWeeklyOffDays("1010100", "1111100");

        Assert.Equal("1010100", result);
    }

    [Fact]
    public void EffectiveWeeklyOffDays_FallsBackToShiftWorkingDays()
    {
        var result = AttendanceWeeklyOffHelper.EffectiveWeeklyOffDays(null, "1111000");

        Assert.Equal("1111000", result);
    }

    [Theory]
    [InlineData("2026-07-04", "second_fourth", false)]
    [InlineData("2026-07-11", "second_fourth", true)]
    [InlineData("2026-07-18", "second_fourth", false)]
    [InlineData("2026-07-25", "second_fourth", true)]
    public void IsEmployeeWorkingDay_SecondFourthSaturdayPattern(string date, string pattern, bool expectedOff)
    {
        var dateObj = AttendanceWeeklyOffHelper.ParseIstDate(date);
        var isWorking = AttendanceWeeklyOffHelper.IsEmployeeWorkingDay(dateObj, null, pattern, "1111111");

        Assert.Equal(!expectedOff, isWorking);
    }

    [Fact]
    public void MonthLabel_ReturnsReadableLabel()
    {
        var label = AttendanceWeeklyOffHelper.MonthLabel(2026, 7);

        Assert.Contains("2026", label);
        Assert.Contains("July", label, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void WeekdayLabel_ReturnsShortDayName()
    {
        var monday = AttendanceWeeklyOffHelper.ParseIstDate("2026-07-20");

        Assert.Equal("Mon", AttendanceWeeklyOffHelper.WeekdayLabel(monday));
    }
}
