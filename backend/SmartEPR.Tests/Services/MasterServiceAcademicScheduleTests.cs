using Moq;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class MasterServiceAcademicScheduleTests
{
    private readonly Mock<IMasterRepository> _repository = new();

    private MasterService CreateService() => new(_repository.Object);

    private static SaveAcademicScheduleRequestDto ValidSave() => new()
    {
        UnderOrgID = 2,
        TMonth = 6,
        ClassID = 1,
        SubjectID = 2,
        WeekID = 3,
        Title = "Unit Plan",
        AyID = 10,
        Description = "Desc"
    };

    private static AcademicScheduleDto Saved(long asid = 50) => new()
    {
        ASID = asid,
        UnderOrgID = 2,
        TMonth = 6,
        ClassID = 1,
        SubjectID = 2,
        WeekID = 3,
        Title = "Unit Plan",
        AyID = 10
    };

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task SaveAcademicScheduleAsync_RejectsMissingOrg(long underOrgId)
    {
        var request = ValidSave();
        request.UnderOrgID = underOrgId;

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(data);
        Assert.Equal("Org / School is required.", error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    public async Task SaveAcademicScheduleAsync_RejectsInvalidMonth(int month)
    {
        var request = ValidSave();
        request.TMonth = month;

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(data);
        Assert.Equal("Month is required.", error);
    }

    [Fact]
    public async Task SaveAcademicScheduleAsync_RejectsMissingClass()
    {
        var request = ValidSave();
        request.ClassID = 0;

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(data);
        Assert.Equal("Class is required.", error);
    }

    [Fact]
    public async Task SaveAcademicScheduleAsync_RejectsMissingSubject()
    {
        var request = ValidSave();
        request.SubjectID = 0;

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(data);
        Assert.Equal("Subject is required.", error);
    }

    [Fact]
    public async Task SaveAcademicScheduleAsync_RejectsMissingWeek()
    {
        var request = ValidSave();
        request.WeekID = 0;

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(data);
        Assert.Equal("Week is required.", error);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task SaveAcademicScheduleAsync_RejectsBlankTitle(string title)
    {
        var request = ValidSave();
        request.Title = title;

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(data);
        Assert.Equal("Title is required.", error);
    }

    [Fact]
    public async Task SaveAcademicScheduleAsync_TrimsTitleAndDescription()
    {
        SaveAcademicScheduleRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAcademicScheduleAsync(It.IsAny<SaveAcademicScheduleRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveAcademicScheduleRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(50);
        _repository
            .Setup(r => r.GetAcademicScheduleByIdAsync(50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved());

        var request = ValidSave();
        request.Title = "  Unit Plan  ";
        request.Description = "  Desc  ";

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(error);
        Assert.Equal("Unit Plan", captured?.Title);
        Assert.Equal("Desc", captured?.Description);
        Assert.NotNull(data);
    }

    [Fact]
    public async Task SaveAcademicScheduleAsync_FillsAyIdFromCurrent_WhenMissing()
    {
        SaveAcademicScheduleRequestDto? captured = null;
        _repository
            .Setup(r => r.GetCurrentAyIdAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(77L);
        _repository
            .Setup(r => r.SaveAcademicScheduleAsync(It.IsAny<SaveAcademicScheduleRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveAcademicScheduleRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(50);
        _repository
            .Setup(r => r.GetAcademicScheduleByIdAsync(50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved());

        var request = ValidSave();
        request.AyID = 0;

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(error);
        Assert.Equal(77, captured?.AyID);
        Assert.NotNull(data);
    }

    [Fact]
    public async Task SaveAcademicScheduleAsync_RejectsWhenAcademicYearUnavailable()
    {
        _repository
            .Setup(r => r.GetCurrentAyIdAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0L);

        var request = ValidSave();
        request.AyID = 0;

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Null(data);
        Assert.Equal("Academic year is required.", error);
        _repository.Verify(
            r => r.SaveAcademicScheduleAsync(It.IsAny<SaveAcademicScheduleRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveAcademicScheduleAsync_Update_PersistsAsid()
    {
        SaveAcademicScheduleRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAcademicScheduleAsync(It.IsAny<SaveAcademicScheduleRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveAcademicScheduleRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(50);
        _repository
            .Setup(r => r.GetAcademicScheduleByIdAsync(50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved(50));

        var request = ValidSave();
        request.ASID = 50;
        request.Title = "Updated";

        await CreateService().SaveAcademicScheduleAsync(request);

        Assert.Equal(50, captured?.ASID);
        Assert.Equal("Updated", captured?.Title);
    }

    [Fact]
    public async Task SaveAcademicScheduleAsync_ReturnsUnableToSave_WhenReloadMissing()
    {
        _repository
            .Setup(r => r.SaveAcademicScheduleAsync(It.IsAny<SaveAcademicScheduleRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(99);
        _repository
            .Setup(r => r.GetAcademicScheduleByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AcademicScheduleDto?)null);

        var (data, error) = await CreateService().SaveAcademicScheduleAsync(ValidSave());

        Assert.Null(data);
        Assert.Equal("Unable to save academic schedule.", error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public async Task DeleteAcademicScheduleAsync_RejectsInvalidId(long asid)
    {
        var (success, error) = await CreateService().DeleteAcademicScheduleAsync(asid);

        Assert.False(success);
        Assert.Equal("Academic schedule is required.", error);
    }

    [Fact]
    public async Task DeleteAcademicScheduleAsync_CallsRepository()
    {
        _repository
            .Setup(r => r.DeleteAcademicScheduleAsync(12, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (success, error) = await CreateService().DeleteAcademicScheduleAsync(12);

        Assert.True(success);
        Assert.Null(error);
        _repository.Verify(r => r.DeleteAcademicScheduleAsync(12, It.IsAny<CancellationToken>()), Times.Once);
    }
}
