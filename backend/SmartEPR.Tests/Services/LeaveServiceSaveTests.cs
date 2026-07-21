using Moq;
using SmartEPR.Core.DTOs.Leave;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class LeaveServiceSaveTests
{
    private readonly Mock<ILeaveRepository> _leaveRepository = new();
    private readonly Mock<IAuditVoucherRepository> _auditRepository = new();
    private readonly Mock<IEmployeeRepository> _employeeRepository = new();

    private LeaveService CreateService() =>
        new(_leaveRepository.Object, _auditRepository.Object, _employeeRepository.Object);

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SaveLeaveTypeAsync_RejectsBlankName(string? name)
    {
        var result = await CreateService().SaveLeaveTypeAsync(new SaveLeaveTypeRequestDto
        {
            UnderOrgID = 2,
            LeaveTypeName = name!
        });

        Assert.Null(result);
        _leaveRepository.Verify(
            r => r.SaveLeaveTypeAsync(It.IsAny<SaveLeaveTypeRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveLeaveTypeAsync_RejectsMissingOrg()
    {
        var result = await CreateService().SaveLeaveTypeAsync(new SaveLeaveTypeRequestDto
        {
            UnderOrgID = 0,
            LeaveTypeName = "Casual"
        });

        Assert.Null(result);
        _leaveRepository.Verify(
            r => r.SaveLeaveTypeAsync(It.IsAny<SaveLeaveTypeRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveLeaveTypeAsync_Insert_CallsRepositoryAndReloads()
    {
        _leaveRepository
            .Setup(r => r.SaveLeaveTypeAsync(It.IsAny<SaveLeaveTypeRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);
        _leaveRepository
            .Setup(r => r.GetLeaveTypeByIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LeaveTypeDto { LeaveTypeID = 5, UnderOrgID = 2, SrNo = 1, LeaveTypeName = "Casual", IsActive = true });

        var result = await CreateService().SaveLeaveTypeAsync(new SaveLeaveTypeRequestDto
        {
            UnderOrgID = 2,
            SrNo = 1,
            LeaveTypeName = "Casual",
            IsActive = true
        });

        Assert.NotNull(result);
        Assert.Equal(5, result!.LeaveTypeID);
        Assert.Equal("Casual", result.LeaveTypeName);
    }

    [Fact]
    public async Task SaveLeaveTypeAsync_Update_PassesExistingId()
    {
        SaveLeaveTypeRequestDto? captured = null;
        _leaveRepository
            .Setup(r => r.SaveLeaveTypeAsync(It.IsAny<SaveLeaveTypeRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveLeaveTypeRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(9);
        _leaveRepository
            .Setup(r => r.GetLeaveTypeByIdAsync(9, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LeaveTypeDto { LeaveTypeID = 9, UnderOrgID = 2, SrNo = 2, LeaveTypeName = "Sick", IsActive = true });

        await CreateService().SaveLeaveTypeAsync(new SaveLeaveTypeRequestDto
        {
            LeaveTypeID = 9,
            UnderOrgID = 2,
            SrNo = 2,
            LeaveTypeName = "Sick"
        });

        Assert.Equal(9, captured?.LeaveTypeID);
    }

    [Fact]
    public async Task SaveLeaveApplyAsync_RejectsMissingOrgUserOrLeaveType()
    {
        var result = await CreateService().SaveLeaveApplyAsync(new SaveLeaveApplyRequestDto
        {
            FromDate = DateTime.Today,
            ToDate = DateTime.Today.AddDays(1)
        });

        Assert.Null(result);
        _leaveRepository.Verify(
            r => r.SaveLeaveApplyAsync(It.IsAny<SaveLeaveApplyRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveLeaveApplyAsync_RejectsMissingDates()
    {
        var result = await CreateService().SaveLeaveApplyAsync(new SaveLeaveApplyRequestDto
        {
            OrgID = 1,
            UserID = 2,
            LeaveTypeID = 3
        });

        Assert.Null(result);
    }

    [Fact]
    public async Task SaveLeaveApplyAsync_Insert_CallsRepositoryAndReloads()
    {
        _leaveRepository
            .Setup(r => r.SaveLeaveApplyAsync(It.IsAny<SaveLeaveApplyRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(40);
        _leaveRepository
            .Setup(r => r.GetLeaveApplyByIdAsync(40, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LeaveApplyDto { UserLeaveApplyID = 40, OrgID = 1, UserID = 2 });

        var result = await CreateService().SaveLeaveApplyAsync(new SaveLeaveApplyRequestDto
        {
            OrgID = 1,
            UserID = 2,
            LeaveTypeID = 3,
            FromDate = new DateTime(2026, 4, 1),
            ToDate = new DateTime(2026, 4, 2)
        });

        Assert.NotNull(result);
        Assert.Equal(40, result!.UserLeaveApplyID);
    }

    [Fact]
    public async Task SaveLeaveApplyAsync_Update_PassesExistingId()
    {
        SaveLeaveApplyRequestDto? captured = null;
        _leaveRepository
            .Setup(r => r.SaveLeaveApplyAsync(It.IsAny<SaveLeaveApplyRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveLeaveApplyRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(40);
        _leaveRepository
            .Setup(r => r.GetLeaveApplyByIdAsync(40, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LeaveApplyDto { UserLeaveApplyID = 40 });

        await CreateService().SaveLeaveApplyAsync(new SaveLeaveApplyRequestDto
        {
            UserLeaveApplyID = 40,
            OrgID = 1,
            UserID = 2,
            LeaveTypeID = 3,
            FromDate = DateTime.Today,
            ToDate = DateTime.Today
        });

        Assert.Equal(40, captured?.UserLeaveApplyID);
    }
}
