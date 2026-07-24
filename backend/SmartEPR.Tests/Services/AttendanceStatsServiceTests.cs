using Moq;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AttendanceStatsServiceTests
{
    private readonly Mock<IAttendancePayrollRepository> _payrollRepository = new();
    private readonly Mock<IAttendanceShiftRepository> _shiftRepository = new();
    private readonly Mock<IAttendanceRecordRepository> _recordRepository = new();
    private readonly Mock<IAttendanceMonthlyOffRepository> _monthlyOffRepository = new();

    private AttendanceStatsService CreateService() => new(
        _payrollRepository.Object,
        _shiftRepository.Object,
        _recordRepository.Object,
        _monthlyOffRepository.Object);

    [Fact]
    public async Task GetStatsAsync_ReturnsEmpty_WhenOrgInvalid()
    {
        var service = CreateService();
        var stats = await service.GetStatsAsync(0, new DateTime(2026, 7, 24));
        Assert.Equal(0, stats.TotalEmployees);
        Assert.Equal(0, stats.TodayAttendance);
    }

    [Fact]
    public async Task GetStatsAsync_CountsPresentLateAndAbsent()
    {
        var date = new DateTime(2026, 7, 24);
        var shift = new AttendanceShiftDto
        {
            ShiftID = 1,
            OrgID = 101,
            ShiftName = "General",
            ShiftCode = "GENERAL",
            StartTime = "09:00",
            EndTime = "18:00",
            GraceMinutes = 15,
            WorkingDays = "1111100",
            IsActive = true
        };

        _payrollRepository
            .Setup(r => r.GetEmployeesAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new AttendancePayrollEmployeeSourceDto { UserID = 1, EmployeeName = "A", EmployeeCode = "E1", AttendanceShiftID = 1 },
                new AttendancePayrollEmployeeSourceDto { UserID = 2, EmployeeName = "B", EmployeeCode = "E2", AttendanceShiftID = 1 }
            ]);
        _shiftRepository
            .Setup(r => r.GetListAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync([shift]);
        _recordRepository
            .Setup(r => r.GetListAsync(101, date, date, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new AttendanceRecordListSourceDto
                {
                    AttendanceID = 10,
                    OrgID = 101,
                    UserID = 1,
                    AttendanceDate = date,
                    CheckInTime = date.AddHours(9).AddMinutes(30),
                    CheckInConfirmed = true,
                    AttendanceShiftID = 1
                }
            ]);
        _payrollRepository
            .Setup(r => r.GetApprovedLeavesAsync(101, date, date, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _monthlyOffRepository
            .Setup(r => r.GetOverridesAsync(101, date, date, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var stats = await CreateService().GetStatsAsync(101, date);

        Assert.Equal(2, stats.TotalEmployees);
        Assert.Equal(1, stats.TodayAttendance);
        Assert.Equal(1, stats.LateCheckIns);
        Assert.Equal(1, stats.AbsentEmployees);
    }
}
