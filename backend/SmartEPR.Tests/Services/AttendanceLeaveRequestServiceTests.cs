using Moq;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AttendanceLeaveRequestServiceTests
{
    private readonly Mock<IAttendanceLeaveRequestRepository> _repository = new();

    private static ApplyAttendanceLeaveRequestDto ValidApplyRequest() => new()
    {
        OrgID = 101,
        Type = "casual",
        StartDate = "2026-07-21",
        EndDate = "2026-07-22",
        Reason = "Family function"
    };

    private static AttendanceLeaveRequestDto SampleLeave(long id = 7) => new()
    {
        LeaveRequestID = id,
        OrgID = 101,
        UserID = 201,
        UserName = "Ravi Patil",
        EmployeeCode = "EMP001",
        LeaveType = "casual",
        StartDate = new DateTime(2026, 7, 21),
        EndDate = new DateTime(2026, 7, 22),
        Reason = "Family function",
        Status = "pending"
    };

    private AttendanceLeaveRequestService CreateService() => new(_repository.Object);

    [Fact]
    public async Task GetListAsync_ReturnsEmptyWhenOrgMissing()
    {
        var list = await CreateService().GetListAsync(0, null, null, null, null);

        Assert.Empty(list);
        _repository.Verify(r => r.GetListAsync(It.IsAny<long>(), It.IsAny<string?>(), It.IsAny<long?>(), It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ApplyAsync_RejectsInvalidLeaveType()
    {
        var request = ValidApplyRequest();
        request.Type = "annual";

        var (data, error) = await CreateService().ApplyAsync(201, request);

        Assert.Null(data);
        Assert.Contains("Invalid leave type", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ApplyAsync_RejectsEndDateBeforeStartDate()
    {
        var request = ValidApplyRequest();
        request.StartDate = "2026-07-25";
        request.EndDate = "2026-07-20";

        var (data, error) = await CreateService().ApplyAsync(201, request);

        Assert.Null(data);
        Assert.Equal("endDate must be on or after startDate.", error);
    }

    [Fact]
    public async Task ApplyAsync_RejectsInvalidDateFormat()
    {
        var request = ValidApplyRequest();
        request.StartDate = "21-07-2026";

        var (data, error) = await CreateService().ApplyAsync(201, request);

        Assert.Null(data);
        Assert.Contains("startDate is required", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ApplyAsync_SavesValidRequest()
    {
        _repository
            .Setup(r => r.ApplyAsync(101, 201, "casual", new DateTime(2026, 7, 21), new DateTime(2026, 7, 22), "Family function", It.IsAny<CancellationToken>()))
            .ReturnsAsync(7);
        _repository
            .Setup(r => r.GetByIdAsync(7, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleLeave());

        var (data, error) = await CreateService().ApplyAsync(201, ValidApplyRequest());

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal("casual", data!.LeaveType);
        Assert.Equal("pending", data.Status);
    }

    [Fact]
    public async Task ReviewAsync_RejectsInvalidStatus()
    {
        var (data, error) = await CreateService().ReviewAsync(7, 301, new ReviewAttendanceLeaveRequestDto
        {
            OrgID = 101,
            Status = "cancelled",
            Comment = "Not allowed"
        });

        Assert.Null(data);
        Assert.Equal("status must be approved or rejected.", error);
    }

    [Fact]
    public async Task ReviewAsync_ApprovesPendingLeave()
    {
        _repository
            .Setup(r => r.ReviewAsync(7, 101, 301, "approved", "OK", It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _repository
            .Setup(r => r.GetByIdAsync(7, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AttendanceLeaveRequestDto
            {
                LeaveRequestID = 7,
                OrgID = 101,
                UserID = 201,
                LeaveType = "casual",
                StartDate = new DateTime(2026, 7, 21),
                EndDate = new DateTime(2026, 7, 22),
                Status = "approved",
                ReviewedAt = new DateTime(2026, 7, 20, 10, 0, 0),
                ReviewComment = "OK"
            });

        var (data, error) = await CreateService().ReviewAsync(7, 301, new ReviewAttendanceLeaveRequestDto
        {
            OrgID = 101,
            Status = "approved",
            Comment = "OK"
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal("approved", data!.Status);
        Assert.Equal("OK", data.ReviewComment);
    }
}
