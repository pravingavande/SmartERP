using Moq;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AttendanceCorrectionServiceTests
{
    private readonly Mock<IAttendanceCorrectionRepository> _correctionRepository = new();
    private readonly Mock<IAttendanceRecordRepository> _recordRepository = new();
    private readonly Mock<IAttendanceRecordService> _recordService = new();

    private static AttendanceRecordListSourceDto CheckedInRecord(long id = 50) => new()
    {
        AttendanceID = id,
        OrgID = 101,
        UserID = 201,
        AttendanceDate = new DateTime(2026, 7, 20),
        CheckInTime = new DateTime(2026, 7, 20, 4, 0, 0, DateTimeKind.Utc),
        CheckInConfirmed = true
    };

    private static AttendanceRecordListSourceDto CompleteRecord(long id = 51) => new()
    {
        AttendanceID = id,
        OrgID = 101,
        UserID = 202,
        AttendanceDate = new DateTime(2026, 7, 20),
        CheckInTime = new DateTime(2026, 7, 20, 4, 0, 0, DateTimeKind.Utc),
        CheckOutTime = new DateTime(2026, 7, 20, 13, 0, 0, DateTimeKind.Utc),
        CheckInConfirmed = true,
        CheckOutConfirmed = true
    };

    private AttendanceCorrectionService CreateService() =>
        new(_correctionRepository.Object, _recordRepository.Object, _recordService.Object);

    [Fact]
    public async Task ReverseAsync_RejectsShortReason()
    {
        var (data, error) = await CreateService().ReverseAsync(1, new ReverseAttendanceCorrectionRequestDto
        {
            OrgID = 101,
            AttendanceID = 50,
            EventType = "check_in",
            Reason = "no"
        });

        Assert.Null(data);
        Assert.Equal("A reason of at least 3 characters is required.", error);
    }

    [Fact]
    public async Task ReverseAsync_RejectsInvalidEventType()
    {
        var (data, error) = await CreateService().ReverseAsync(1, new ReverseAttendanceCorrectionRequestDto
        {
            OrgID = 101,
            AttendanceID = 50,
            EventType = "invalid",
            Reason = "Mistake"
        });

        Assert.Null(data);
        Assert.Equal("eventType must be check_in or check_out.", error);
    }

    [Fact]
    public async Task ReverseAsync_RejectsWhenNoCheckInExists()
    {
        _recordRepository
            .Setup(r => r.GetByIdAsync(50, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AttendanceRecordListSourceDto
            {
                AttendanceID = 50,
                OrgID = 101,
                UserID = 201,
                AttendanceDate = new DateTime(2026, 7, 20)
            });

        var (data, error) = await CreateService().ReverseAsync(1, new ReverseAttendanceCorrectionRequestDto
        {
            OrgID = 101,
            AttendanceID = 50,
            EventType = "check_in",
            Reason = "Marked by mistake"
        });

        Assert.Null(data);
        Assert.Equal("No check-in to reverse.", error);
    }

    [Fact]
    public async Task ReverseAsync_ReversesCheckInSuccessfully()
    {
        _recordRepository
            .Setup(r => r.GetByIdAsync(50, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CheckedInRecord());
        _correctionRepository
            .Setup(r => r.ReverseAsync(50, 101, "check_in", 1, "Marked by mistake", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _recordService
            .Setup(r => r.GetByIdAsync(50, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AttendanceRecordDto { AttendanceID = 50, OrgID = 101, UserID = 201, AttendanceDate = new DateTime(2026, 7, 20) });

        var (data, error) = await CreateService().ReverseAsync(1, new ReverseAttendanceCorrectionRequestDto
        {
            OrgID = 101,
            AttendanceID = 50,
            EventType = "check_in",
            Reason = "Marked by mistake"
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.True(data!.Success);
        Assert.Equal(50, data.AttendanceID);
    }

    [Fact]
    public async Task ForceCheckoutAsync_RejectsWhenAlreadyCheckedOut()
    {
        _recordRepository
            .Setup(r => r.GetByIdAsync(51, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CompleteRecord());

        var (data, error) = await CreateService().ForceCheckoutAsync(1, new ForceCheckoutAttendanceRequestDto
        {
            OrgID = 101,
            AttendanceID = 51,
            Reason = "Forgot checkout"
        });

        Assert.Null(data);
        Assert.Equal("Employee already has a check-out on this record.", error);
    }

    [Fact]
    public async Task ForceCheckoutAsync_RejectsWhenCheckInPending()
    {
        _recordRepository
            .Setup(r => r.GetByIdAsync(50, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AttendanceRecordListSourceDto
            {
                AttendanceID = 50,
                OrgID = 101,
                UserID = 201,
                AttendanceDate = new DateTime(2026, 7, 20),
                CheckInTime = new DateTime(2026, 7, 20, 4, 0, 0, DateTimeKind.Utc),
                CheckInConfirmed = false
            });

        var (data, error) = await CreateService().ForceCheckoutAsync(1, new ForceCheckoutAttendanceRequestDto
        {
            OrgID = 101,
            AttendanceID = 50,
            Reason = "Admin checkout"
        });

        Assert.Null(data);
        Assert.Contains("pending confirmation", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ForceCheckoutAsync_SucceedsForOpenCheckIn()
    {
        var checkIn = new DateTime(2026, 7, 20, 4, 0, 0, DateTimeKind.Utc);
        var checkoutAt = new DateTime(2026, 7, 20, 13, 0, 0, DateTimeKind.Utc);
        _recordRepository
            .Setup(r => r.GetByIdAsync(50, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CheckedInRecord());
        _correctionRepository
            .Setup(r => r.ForceCheckoutAsync(50, 101, checkoutAt, 1, "Forgot checkout", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _recordService
            .Setup(r => r.GetByIdAsync(50, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AttendanceRecordDto
            {
                AttendanceID = 50,
                OrgID = 101,
                UserID = 201,
                AttendanceDate = new DateTime(2026, 7, 20),
                CheckInTime = checkIn,
                CheckOutTime = checkoutAt,
                HasCheckedOut = true
            });

        var (data, error) = await CreateService().ForceCheckoutAsync(1, new ForceCheckoutAttendanceRequestDto
        {
            OrgID = 101,
            AttendanceID = 50,
            Reason = "Forgot checkout",
            CheckoutAt = checkoutAt
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.True(data!.Success);
    }
}
