using SmartEPR.Infrastructure.Attendance;
using Xunit;

namespace SmartEPR.Tests.Attendance;

public sealed class AttendanceHoursHelperTests
{
    private static AttendanceShiftHoursInput StandardShift() => new()
    {
        StartTime = "09:00",
        EndTime = "18:00",
        RequiredWorkMinutes = 480,
        LunchMinutes = 60,
        TimingMode = "fixed",
        WorkingDays = "1111100"
    };

    [Fact]
    public void ComputeDayMetrics_NoCheckIn_WorkingDay_HasShortfall()
    {
        var date = new DateTime(2026, 7, 20);
        var metrics = AttendanceHoursHelper.ComputeDayMetrics(date, null, null, StandardShift(), isWorkingDay: true);

        Assert.Equal(0, metrics.TotalHours);
        Assert.Equal(0, metrics.NetHours);
        Assert.Equal(8, metrics.ShortfallHours);
        Assert.False(metrics.IsDayComplete);
        Assert.False(metrics.HasCheckedOut);
    }

    [Fact]
    public void ComputeDayMetrics_CompleteEightHourDay_IsDayComplete()
    {
        var date = new DateTime(2026, 7, 20);
        var checkIn = new DateTime(2026, 7, 20, 9, 0, 0, DateTimeKind.Utc);
        var checkOut = new DateTime(2026, 7, 20, 18, 0, 0, DateTimeKind.Utc);

        var metrics = AttendanceHoursHelper.ComputeDayMetrics(date, checkIn, checkOut, StandardShift(), isWorkingDay: true);

        Assert.Equal(9, metrics.TotalHours);
        Assert.Equal(8, metrics.NetHours);
        Assert.Equal(0, metrics.ShortfallHours);
        Assert.True(metrics.IsDayComplete);
        Assert.True(metrics.HasCheckedOut);
    }

    [Fact]
    public void ComputeDayMetrics_ShortDay_HasShortfall()
    {
        var date = new DateTime(2026, 7, 20);
        var checkIn = new DateTime(2026, 7, 20, 9, 0, 0, DateTimeKind.Utc);
        var checkOut = new DateTime(2026, 7, 20, 14, 0, 0, DateTimeKind.Utc);

        var metrics = AttendanceHoursHelper.ComputeDayMetrics(date, checkIn, checkOut, StandardShift(), isWorkingDay: true);

        Assert.True(metrics.ShortfallHours > 0);
        Assert.False(metrics.IsDayComplete);
    }

    [Fact]
    public void ComputeDayMetrics_WeekOffDay_NoShortfall()
    {
        var date = new DateTime(2026, 7, 26);
        var checkIn = new DateTime(2026, 7, 26, 10, 0, 0, DateTimeKind.Utc);
        var checkOut = new DateTime(2026, 7, 26, 12, 0, 0, DateTimeKind.Utc);

        var metrics = AttendanceHoursHelper.ComputeDayMetrics(date, checkIn, checkOut, StandardShift(), isWorkingDay: false);

        Assert.Equal(0, metrics.ShortfallHours);
        Assert.False(metrics.IsWorkingDay);
        Assert.True(metrics.HasCheckedOut);
    }

    [Fact]
    public void ToHoursInput_MapsShiftDto()
    {
        var shift = new SmartEPR.Core.DTOs.Attendance.AttendanceShiftDto
        {
            ShiftID = 1,
            OrgID = 10,
            ShiftName = "General",
            ShiftCode = "GENERAL",
            StartTime = "09:00",
            EndTime = "18:00",
            RequiredWorkMinutes = 480,
            LunchMinutes = 45,
            TimingMode = "flexible"
        };

        var input = AttendanceHoursHelper.ToHoursInput(shift);

        Assert.NotNull(input);
        Assert.Equal("flexible", input!.TimingMode);
        Assert.Equal(45, input.LunchMinutes);
    }
}
