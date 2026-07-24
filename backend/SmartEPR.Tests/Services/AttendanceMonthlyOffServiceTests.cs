using Moq;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AttendanceMonthlyOffServiceTests
{
    private readonly Mock<IAttendanceMonthlyOffRepository> _monthlyOffRepository = new();
    private readonly Mock<IAttendanceShiftRepository> _shiftRepository = new();

    private static AttendanceShiftDto GeneralShift() => new()
    {
        ShiftID = 1,
        OrgID = 101,
        ShiftName = "General",
        ShiftCode = "GENERAL",
        StartTime = "09:00",
        EndTime = "18:00",
        WorkingDays = "1111100",
        IsActive = true
    };

    private static AttendanceMonthlyOffEmployeeSourceDto SampleEmployee(long userId = 201) => new()
    {
        UserID = userId,
        EmployeeName = "Ravi Patil",
        EmployeeCode = "EMP001",
        AttendanceShiftID = 1,
        WeeklyOffDays = "1111100",
        SaturdayOffPattern = "none"
    };

    private AttendanceMonthlyOffService CreateService() =>
        new(_monthlyOffRepository.Object, _shiftRepository.Object);

    [Fact]
    public async Task GetPlanAsync_ThrowsWhenOrgMissing()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => CreateService().GetPlanAsync(0, 2026, 7));
    }

    [Fact]
    public async Task GetPlanAsync_BuildsPlanWithEmployeesAndDayHeaders()
    {
        _monthlyOffRepository
            .Setup(r => r.GetEmployeesAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceMonthlyOffEmployeeSourceDto> { SampleEmployee() });
        _shiftRepository
            .Setup(r => r.GetListAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceShiftDto> { GeneralShift() });
        _monthlyOffRepository
            .Setup(r => r.GetOverridesAsync(101, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceMonthlyOffOverrideRowDto>());

        var plan = await CreateService().GetPlanAsync(101, 2026, 7);

        Assert.Equal(2026, plan.Year);
        Assert.Equal(7, plan.Month);
        Assert.Equal(31, plan.DayHeaders.Count);
        Assert.Single(plan.Employees);
        Assert.Equal("Ravi Patil", plan.Employees[0].Name);
        Assert.Equal(31, plan.Employees[0].Days.Count);
        Assert.Contains(plan.DayHeaders, h => h.IsSunday);
    }

    [Fact]
    public async Task GetPlanAsync_AppliesForcedOffOverride()
    {
        _monthlyOffRepository
            .Setup(r => r.GetEmployeesAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceMonthlyOffEmployeeSourceDto> { SampleEmployee() });
        _shiftRepository
            .Setup(r => r.GetListAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceShiftDto> { GeneralShift() });
        _monthlyOffRepository
            .Setup(r => r.GetOverridesAsync(101, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceMonthlyOffOverrideRowDto>
            {
                new() { UserID = 201, WorkDate = new DateTime(2026, 7, 21), IsOff = true }
            });

        var plan = await CreateService().GetPlanAsync(101, 2026, 7);
        var mondayCell = plan.Employees[0].Days.First(d => d.Date == "2026-07-21");

        Assert.Equal("off", mondayCell.Override);
        Assert.True(mondayCell.EffectiveOff);
    }

    [Fact]
    public async Task SaveChangesAsync_RejectsInvalidEmployee()
    {
        _monthlyOffRepository
            .Setup(r => r.GetEmployeesAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceMonthlyOffEmployeeSourceDto> { SampleEmployee() });

        var (data, error) = await CreateService().SaveChangesAsync(new SaveAttendanceMonthlyOffRequestDto
        {
            OrgID = 101,
            Year = 2026,
            Month = 7,
            Changes =
            [
                new AttendanceMonthlyOffChangeDto { UserID = 999, Date = "2026-07-10", Override = "off" }
            ]
        });

        Assert.Null(data);
        Assert.Equal("Invalid employee for this organization.", error);
    }

    [Fact]
    public async Task SaveChangesAsync_RejectsDateOutsideMonth()
    {
        _monthlyOffRepository
            .Setup(r => r.GetEmployeesAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceMonthlyOffEmployeeSourceDto> { SampleEmployee() });

        var (data, error) = await CreateService().SaveChangesAsync(new SaveAttendanceMonthlyOffRequestDto
        {
            OrgID = 101,
            Year = 2026,
            Month = 7,
            Changes =
            [
                new AttendanceMonthlyOffChangeDto { UserID = 201, Date = "2026-08-01", Override = "off" }
            ]
        });

        Assert.Null(data);
        Assert.Contains("outside the selected month", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SaveChangesAsync_SavesValidChanges()
    {
        _monthlyOffRepository
            .Setup(r => r.GetEmployeesAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceMonthlyOffEmployeeSourceDto> { SampleEmployee() });
        _monthlyOffRepository
            .Setup(r => r.SetOverrideAsync(101, 201, new DateTime(2026, 7, 10), "off", It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (data, error) = await CreateService().SaveChangesAsync(new SaveAttendanceMonthlyOffRequestDto
        {
            OrgID = 101,
            Year = 2026,
            Month = 7,
            Changes =
            [
                new AttendanceMonthlyOffChangeDto { UserID = 201, Date = "2026-07-10", Override = "off" }
            ]
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(1, data!.Updated);
    }
}
