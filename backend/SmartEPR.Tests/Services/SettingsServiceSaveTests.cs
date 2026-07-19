using Moq;
using SmartEPR.Core.DTOs.Settings;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class SettingsServiceSaveTests
{
    private readonly Mock<ISettingsRepository> _repository = new();

    private SettingsService CreateService() => new(_repository.Object);

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task SaveLanguageAsync_RejectsMissingUnderOrg(long underOrgId)
    {
        var (data, error) = await CreateService().SaveLanguageAsync(new SaveSoftwareLanguageRequestDto
        {
            UnderOrgID = underOrgId,
            Condition = "E"
        });

        Assert.Null(data);
        Assert.Equal("Under organization is required.", error);
        _repository.Verify(
            r => r.SaveLanguageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData("X")]
    [InlineData("ME")]
    [InlineData("   ")]
    public async Task SaveLanguageAsync_RejectsInvalidCondition(string condition)
    {
        var (data, error) = await CreateService().SaveLanguageAsync(new SaveSoftwareLanguageRequestDto
        {
            UnderOrgID = 1,
            Condition = condition
        });

        Assert.Null(data);
        Assert.Equal("Language must be M (Marathi) or E (English).", error);
    }

    [Theory]
    [InlineData("m", "M")]
    [InlineData("E", "E")]
    [InlineData(" e ", "E")]
    public async Task SaveLanguageAsync_NormalizesConditionAndSaves(string input, string expected)
    {
        string? captured = null;
        _repository
            .Setup(r => r.SaveLanguageAsync(2, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<long, string, CancellationToken>((_, c, _) => captured = c)
            .ReturnsAsync(new SoftwareLanguageDto { UnderOrgID = 2, Condition = expected });

        var (data, error) = await CreateService().SaveLanguageAsync(new SaveSoftwareLanguageRequestDto
        {
            UnderOrgID = 2,
            Condition = input
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(expected, captured);
        Assert.Equal(expected, data!.Condition);
    }

    [Fact]
    public async Task SaveLanguageAsync_ReturnsError_WhenRepositoryReturnsNull()
    {
        _repository
            .Setup(r => r.SaveLanguageAsync(1, "M", It.IsAny<CancellationToken>()))
            .ReturnsAsync((SoftwareLanguageDto?)null);

        var (data, error) = await CreateService().SaveLanguageAsync(new SaveSoftwareLanguageRequestDto
        {
            UnderOrgID = 1,
            Condition = "M"
        });

        Assert.Null(data);
        Assert.Equal("Unable to save language setting.", error);
    }

    [Fact]
    public async Task GetLanguageAsync_ReturnsDefaultEnglish_WhenMissing()
    {
        _repository
            .Setup(r => r.GetLanguageAsync(9, It.IsAny<CancellationToken>()))
            .ReturnsAsync((SoftwareLanguageDto?)null);

        var result = await CreateService().GetLanguageAsync(9);

        Assert.Equal(9, result.UnderOrgID);
        Assert.Equal("E", result.Condition);
        Assert.Equal("Software Language", result.Title);
    }
}
