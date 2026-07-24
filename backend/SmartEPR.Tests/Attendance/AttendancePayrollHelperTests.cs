using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Infrastructure.Attendance;
using Xunit;

namespace SmartEPR.Tests.Attendance;

public sealed class AttendancePayrollHelperTests
{
    [Fact]
    public void ComputeDayCounts_CountsPresentLeaveAbsentAndWeeklyOff()
    {
        bool IsWorkingDay(string dateStr, DateTime _)
        {
            var dow = AttendanceWeeklyOffHelper.ParseIstDate(dateStr);
            var day = AttendanceWeeklyOffHelper.DayOfWeekIst(dow);
            return day is not 0 and not 6;
        }

        var present = new HashSet<string>(StringComparer.Ordinal) { "2026-07-01", "2026-07-02", "2026-07-03" };
        var leave = new HashSet<string>(StringComparer.Ordinal) { "2026-07-06" };

        var counts = AttendancePayrollHelper.ComputeDayCounts(
            2026,
            7,
            IsWorkingDay,
            present,
            leave,
            asOfDate: "2026-07-10");

        Assert.Equal(2026, counts.Year);
        Assert.Equal(7, counts.Month);
        Assert.True(counts.PresentDays >= 3);
        Assert.Equal(1, counts.LeaveDays);
        Assert.True(counts.WeeklyOffDays >= 2);
        Assert.Equal(10, counts.DaysElapsedInMonth);
    }

    [Fact]
    public void ComputeAmounts_CalculatesPayableFromPresentAndLeave()
    {
        var counts = new AttendancePayrollDayCounts
        {
            Year = 2026,
            Month = 7,
            WorkingDaysInMonth = 22,
            PresentDays = 18,
            LeaveDays = 2,
            AbsentDays = 2,
            PendingDays = 0
        };

        var amounts = AttendancePayrollHelper.ComputeAmounts(22000, counts);

        Assert.Equal(22000, amounts.MonthlySalary);
        Assert.Equal(1000, amounts.PerDayRate);
        Assert.Equal(20000, amounts.EarnedSoFar);
        Assert.Equal(2000, amounts.DeductionForAbsences);
        Assert.Equal(20000, amounts.PayableSalary);
        Assert.Equal(20, amounts.PaidDays);
    }

    [Fact]
    public void ExpandLeaveDates_ClipsToMonthRange()
    {
        var leaves = new[]
        {
            new AttendancePayrollApprovedLeaveDto
            {
                UserID = 101,
                StartDate = new DateTime(2026, 6, 28),
                EndDate = new DateTime(2026, 7, 3)
            }
        };

        var dates = AttendancePayrollHelper.ExpandLeaveDates(leaves, "2026-07-01", "2026-07-31");

        Assert.Equal(3, dates.Count);
        Assert.Contains("2026-07-01", dates);
        Assert.Contains("2026-07-02", dates);
        Assert.Contains("2026-07-03", dates);
        Assert.DoesNotContain("2026-06-28", dates);
    }

    [Theory]
    [InlineData("1111100", "Sat, Sun")]
    [InlineData("1111111", "No weekly off")]
    public void WeeklyOffDaysLabel_FormatsOffDays(string workingDays, string expectedContains)
    {
        var label = AttendancePayrollHelper.WeeklyOffDaysLabel(workingDays);

        Assert.Contains(expectedContains, label);
    }

    [Theory]
    [InlineData("second_fourth", "2nd & 4th Saturday off")]
    [InlineData("none", "Follow weekly schedule")]
    public void SaturdayOffPatternLabel_ReturnsReadableText(string pattern, string expected)
    {
        Assert.Equal(expected, AttendancePayrollHelper.SaturdayOffPatternLabel(pattern));
    }
}
