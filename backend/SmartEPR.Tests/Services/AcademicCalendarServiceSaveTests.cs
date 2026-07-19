using Moq;
using SmartEPR.Core.DTOs.Calendar;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AcademicCalendarServiceSaveTests
{
    private readonly Mock<IAcademicCalendarRepository> _repository = new();

    private AcademicCalendarService CreateService() => new(_repository.Object);

    [Fact]
    public async Task SaveHolidayAsync_TrimsNames_AndReloads()
    {
        HolidayItem? captured = null;
        var date = new DateTime(2026, 8, 15);
        _repository
            .Setup(r => r.SaveHolidayAsync(It.IsAny<HolidayItem>(), It.IsAny<CancellationToken>()))
            .Callback<HolidayItem, CancellationToken>((item, _) => captured = item)
            .ReturnsAsync(4);
        _repository
            .Setup(r => r.GetHolidaysAsync(date, date, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<HolidayItem>
            {
                new()
                {
                    HolidayId = 4,
                    HolidayDate = date,
                    NameMr = "स्वातंत्र्य दिन",
                    NameEn = "Independence Day",
                    HolidayType = "national",
                    Color = "#7b1fa2",
                    Year = 2026
                }
            });

        var result = await CreateService().SaveHolidayAsync(new SaveHolidayRequestDto
        {
            HolidayDate = date,
            NameMr = "  स्वातंत्र्य दिन  ",
            NameEn = "  Independence Day  ",
            Year = 2026
        });

        Assert.NotNull(result);
        Assert.Equal(4, result!.HolidayId);
        Assert.Equal("स्वातंत्र्य दिन", captured?.NameMr);
        Assert.Equal("Independence Day", captured?.NameEn);
        Assert.Equal(0, captured?.HolidayId);
    }

    [Fact]
    public async Task SaveHolidayAsync_Update_PassesHolidayId()
    {
        HolidayItem? captured = null;
        var date = new DateTime(2026, 1, 26);
        _repository
            .Setup(r => r.SaveHolidayAsync(It.IsAny<HolidayItem>(), It.IsAny<CancellationToken>()))
            .Callback<HolidayItem, CancellationToken>((item, _) => captured = item)
            .ReturnsAsync(9);
        _repository
            .Setup(r => r.GetHolidaysAsync(date, date, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<HolidayItem>
            {
                new() { HolidayId = 9, HolidayDate = date, NameMr = "प्रजासत्ताक दिन", NameEn = "Republic Day", Year = 2026 }
            });

        await CreateService().SaveHolidayAsync(new SaveHolidayRequestDto
        {
            HolidayId = 9,
            HolidayDate = date,
            NameMr = "प्रजासत्ताक दिन",
            NameEn = "Republic Day",
            Year = 2026
        });

        Assert.Equal(9, captured?.HolidayId);
    }

    [Fact]
    public async Task SaveFestivalAsync_TrimsNames_AndReloads()
    {
        FestivalItem? captured = null;
        var date = new DateTime(2026, 10, 20);
        _repository
            .Setup(r => r.SaveFestivalAsync(It.IsAny<FestivalItem>(), It.IsAny<CancellationToken>()))
            .Callback<FestivalItem, CancellationToken>((item, _) => captured = item)
            .ReturnsAsync(2);
        _repository
            .Setup(r => r.GetFestivalsAsync(date, date, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FestivalItem>
            {
                new() { FestivalId = 2, FestivalDate = date, NameMr = "दिवाळी", NameEn = "Diwali", Year = 2026 }
            });

        var result = await CreateService().SaveFestivalAsync(new SaveFestivalRequestDto
        {
            FestivalDate = date,
            NameMr = "  दिवाळी  ",
            NameEn = "  Diwali  ",
            Year = 2026
        });

        Assert.NotNull(result);
        Assert.Equal("दिवाळी", captured?.NameMr);
        Assert.Equal("Diwali", captured?.NameEn);
        Assert.Equal(2, result!.FestivalId);
    }

    [Fact]
    public async Task DeleteHolidayAsync_CallsRepository()
    {
        _repository.Setup(r => r.DeleteHolidayAsync(4, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        Assert.True(await CreateService().DeleteHolidayAsync(4));
        _repository.Verify(r => r.DeleteHolidayAsync(4, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteFestivalAsync_CallsRepository()
    {
        _repository.Setup(r => r.DeleteFestivalAsync(2, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        Assert.True(await CreateService().DeleteFestivalAsync(2));
        _repository.Verify(r => r.DeleteFestivalAsync(2, It.IsAny<CancellationToken>()), Times.Once);
    }
}
