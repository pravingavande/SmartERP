using Moq;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AttendancePayrollServiceTests
{
    private readonly Mock<IAttendancePayrollRepository> _payrollRepository = new();
    private readonly Mock<IAttendanceShiftRepository> _shiftRepository = new();
    private readonly Mock<IAttendanceMonthlyOffRepository> _monthlyOffRepository = new();

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

    private static AttendancePayrollEmployeeSourceDto SampleEmployee() => new()
    {
        UserID = 201,
        EmployeeName = "Ravi Patil",
        EmployeeCode = "EMP001",
        MonthlySalary = 22000,
        AttendanceShiftID = 1,
        WeeklyOffDays = "1111100",
        SaturdayOffPattern = "none"
    };

    private AttendancePayrollService CreateService() =>
        new(_payrollRepository.Object, _shiftRepository.Object, _monthlyOffRepository.Object);

    [Fact]
    public async Task GetTeamPayrollAsync_ReturnsEmptyWhenOrgMissing()
    {
        var rows = await CreateService().GetTeamPayrollAsync(0, 2026, 7);

        Assert.Empty(rows);
    }

    [Fact]
    public async Task GetTeamPayrollAsync_ComputesPayrollForEmployeeWithPresentDays()
    {
        SetupJuly2026Context(presentDates:
        [
            new AttendancePayrollPresentDateDto { UserID = 201, AttendanceDate = new DateTime(2026, 7, 1) },
            new AttendancePayrollPresentDateDto { UserID = 201, AttendanceDate = new DateTime(2026, 7, 2) },
            new AttendancePayrollPresentDateDto { UserID = 201, AttendanceDate = new DateTime(2026, 7, 3) }
        ]);

        var rows = await CreateService().GetTeamPayrollAsync(101, 2026, 7);

        Assert.Single(rows);
        var row = rows[0];
        Assert.Equal(201, row.EmployeeID);
        Assert.Equal("Ravi Patil", row.EmployeeName);
        Assert.Equal(22000, row.MonthlySalary);
        Assert.True(row.PresentDays >= 3);
        Assert.True(row.SalaryConfigured);
        Assert.True(row.PayableSalary > 0);
    }

    [Fact]
    public async Task GetEmployeePayrollAsync_ReturnsNullForUnknownEmployee()
    {
        SetupJuly2026Context();

        var row = await CreateService().GetEmployeePayrollAsync(101, 999, 2026, 7);

        Assert.Null(row);
    }

    [Fact]
    public async Task GetEmployeePayrollAsync_ReturnsSingleEmployeeRow()
    {
        SetupJuly2026Context(presentDates:
        [
            new AttendancePayrollPresentDateDto { UserID = 201, AttendanceDate = new DateTime(2026, 7, 1) }
        ]);

        var row = await CreateService().GetEmployeePayrollAsync(101, 201, 2026, 7);

        Assert.NotNull(row);
        Assert.Equal("EMP001", row!.EmployeeCode);
        Assert.Equal("General", row.ShiftName);
    }

    [Fact]
    public async Task GetTeamPayrollAsync_IncludesApprovedLeaveInPaidDays()
    {
        SetupJuly2026Context(
            presentDates:
            [
                new AttendancePayrollPresentDateDto { UserID = 201, AttendanceDate = new DateTime(2026, 7, 1) }
            ],
            approvedLeaves:
            [
                new AttendancePayrollApprovedLeaveDto
                {
                    UserID = 201,
                    StartDate = new DateTime(2026, 7, 2),
                    EndDate = new DateTime(2026, 7, 2)
                }
            ]);

        var rows = await CreateService().GetTeamPayrollAsync(101, 2026, 7);

        Assert.Equal(1, rows[0].LeaveDays);
        Assert.True(rows[0].PaidDays >= 2);
    }

    private void SetupJuly2026Context(
        IReadOnlyList<AttendancePayrollPresentDateDto>? presentDates = null,
        IReadOnlyList<AttendancePayrollApprovedLeaveDto>? approvedLeaves = null)
    {
        _payrollRepository
            .Setup(r => r.GetEmployeesAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendancePayrollEmployeeSourceDto> { SampleEmployee() });
        _shiftRepository
            .Setup(r => r.GetListAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceShiftDto> { GeneralShift() });
        _payrollRepository
            .Setup(r => r.GetPresentDatesAsync(101, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(presentDates ?? []);
        _payrollRepository
            .Setup(r => r.GetApprovedLeavesAsync(101, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(approvedLeaves ?? []);
        _monthlyOffRepository
            .Setup(r => r.GetOverridesAsync(101, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AttendanceMonthlyOffOverrideRowDto>());
    }
}
