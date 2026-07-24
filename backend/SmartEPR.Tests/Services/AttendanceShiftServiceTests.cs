using Moq;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AttendanceShiftServiceTests
{
    private readonly Mock<IAttendanceShiftRepository> _repository = new();

    private static SaveAttendanceShiftRequestDto ValidCreateRequest() => new()
    {
        OrgID = 101,
        ShiftName = "Morning Shift",
        ShiftCode = "morning",
        StartTime = "09:00",
        EndTime = "18:00",
        GraceMinutes = 15,
        EarlyCheckinMinutes = 60,
        RequiredWorkMinutes = 480,
        LunchMinutes = 60,
        WorkingDays = "1111100",
        TimingMode = "fixed"
    };

    private static AttendanceShiftDto SampleShift(long id = 5) => new()
    {
        ShiftID = id,
        OrgID = 101,
        ShiftName = "Morning Shift",
        ShiftCode = "MORNING",
        StartTime = "09:00",
        EndTime = "18:00",
        GraceMinutes = 15,
        EarlyCheckinMinutes = 60,
        RequiredWorkMinutes = 480,
        LunchMinutes = 60,
        WorkingDays = "1111100",
        IsActive = true,
        TimingMode = "fixed"
    };

    private AttendanceShiftService CreateService() => new(_repository.Object);

    [Fact]
    public async Task CreateAsync_RejectsMissingOrganization()
    {
        var request = ValidCreateRequest();
        request.OrgID = 0;

        var (data, error) = await CreateService().CreateAsync(request);

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _repository.Verify(r => r.SaveAsync(It.IsAny<AttendanceShiftDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_RejectsBlankShiftName()
    {
        var request = ValidCreateRequest();
        request.ShiftName = "   ";

        var (data, error) = await CreateService().CreateAsync(request);

        Assert.Null(data);
        Assert.Equal("Shift name is required.", error);
    }

    [Fact]
    public async Task CreateAsync_RejectsBlankShiftCode()
    {
        var request = ValidCreateRequest();
        request.ShiftCode = "";

        var (data, error) = await CreateService().CreateAsync(request);

        Assert.Null(data);
        Assert.Equal("Shift code is required.", error);
    }

    [Fact]
    public async Task CreateAsync_TrimsAndUppercasesCodeBeforeSave()
    {
        AttendanceShiftDto? captured = null;
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<AttendanceShiftDto>(), It.IsAny<CancellationToken>()))
            .Callback<AttendanceShiftDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(12);
        _repository
            .Setup(r => r.GetByIdAsync(12, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleShift(12));

        var request = ValidCreateRequest();
        request.ShiftName = "  Morning Shift  ";
        request.ShiftCode = " morning ";

        var (data, error) = await CreateService().CreateAsync(request);

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.NotNull(captured);
        Assert.Equal("Morning Shift", captured!.ShiftName);
        Assert.Equal("MORNING", captured.ShiftCode);
        Assert.Equal("fixed", captured.TimingMode);
    }

    [Fact]
    public async Task UpdateAsync_RejectsWhenShiftNotFound()
    {
        _repository
            .Setup(r => r.GetByIdAsync(99, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AttendanceShiftDto?)null);

        var (data, error) = await CreateService().UpdateAsync(99, new UpdateAttendanceShiftRequestDto
        {
            OrgID = 101,
            ShiftName = "Updated"
        });

        Assert.Null(data);
        Assert.Equal("Shift not found.", error);
    }

    [Fact]
    public async Task UpdateAsync_MergesFieldsAndSaves()
    {
        _repository
            .Setup(r => r.GetByIdAsync(5, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleShift());
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<AttendanceShiftDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(5L);
        _repository
            .Setup(r => r.GetByIdAsync(5, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleShift());

        var (data, error) = await CreateService().UpdateAsync(5, new UpdateAttendanceShiftRequestDto
        {
            OrgID = 101,
            ShiftName = "Evening Shift",
            IsActive = false
        });

        Assert.Null(error);
        Assert.NotNull(data);
        _repository.Verify(r => r.SaveAsync(It.Is<AttendanceShiftDto>(s =>
            s.ShiftID == 5 && s.ShiftName == "Evening Shift" && s.IsActive == false), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_RejectsWhenShiftNotFound()
    {
        _repository
            .Setup(r => r.GetByIdAsync(5, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AttendanceShiftDto?)null);

        var (success, error) = await CreateService().DeleteAsync(5, 101);

        Assert.False(success);
        Assert.Equal("Shift not found.", error);
    }

    [Fact]
    public async Task DeleteAsync_DeletesExistingShift()
    {
        _repository
            .Setup(r => r.GetByIdAsync(5, 101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleShift());
        _repository
            .Setup(r => r.DeleteAsync(5, 101, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (success, error) = await CreateService().DeleteAsync(5, 101);

        Assert.True(success);
        Assert.Null(error);
    }
}
