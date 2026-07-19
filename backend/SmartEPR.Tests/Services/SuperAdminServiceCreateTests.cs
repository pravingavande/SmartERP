using Moq;
using SmartEPR.Core.DTOs.SuperAdmin;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class SuperAdminServiceCreateTests
{
    private readonly Mock<ISuperAdminRepository> _repository = new();

    private SuperAdminService CreateService() => new(_repository.Object);

    private static CreateSansthaWithOwnerRequestDto ValidRequest() => new()
    {
        SansthaName = "Test Sanstha",
        BusinessCategoryID = 3,
        OwnerFirstName = "Ramesh",
        OwnerLastName = "Patil",
        OwnerMobile = "9876543210",
        OwnerPassword = "Secret@1"
    };

    [Fact]
    public async Task CreateSansthaWithOwnerAsync_RejectsBlankSansthaName()
    {
        var request = ValidRequest();
        request.SansthaName = "   ";

        var (data, error) = await CreateService().CreateSansthaWithOwnerAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Sanstha name is required.", error);
        _repository.Verify(
            r => r.CreateSansthaWithOwnerAsync(It.IsAny<CreateSansthaWithOwnerRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateSansthaWithOwnerAsync_RejectsBlankOwnerFirstName()
    {
        var request = ValidRequest();
        request.OwnerFirstName = "";

        var (data, error) = await CreateService().CreateSansthaWithOwnerAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Owner first name is required.", error);
    }

    [Fact]
    public async Task CreateSansthaWithOwnerAsync_RejectsBlankOwnerLastName()
    {
        var request = ValidRequest();
        request.OwnerLastName = " ";

        var (data, error) = await CreateService().CreateSansthaWithOwnerAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Owner last name is required.", error);
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("abcdefghij")]
    [InlineData("")]
    public async Task CreateSansthaWithOwnerAsync_RejectsInvalidMobile(string mobile)
    {
        var request = ValidRequest();
        request.OwnerMobile = mobile;

        var (data, error) = await CreateService().CreateSansthaWithOwnerAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Owner mobile must be exactly 10 digits (used as login username).", error);
    }

    [Fact]
    public async Task CreateSansthaWithOwnerAsync_RejectsBlankPassword()
    {
        var request = ValidRequest();
        request.OwnerPassword = "  ";

        var (data, error) = await CreateService().CreateSansthaWithOwnerAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Owner password is required.", error);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CreateSansthaWithOwnerAsync_RejectsMissingBusinessCategory(int? categoryId)
    {
        var request = ValidRequest();
        request.BusinessCategoryID = categoryId;

        var (data, error) = await CreateService().CreateSansthaWithOwnerAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Business category is required.", error);
    }

    [Fact]
    public async Task CreateSansthaWithOwnerAsync_TrimsFieldsBeforeRepository()
    {
        CreateSansthaWithOwnerRequestDto? captured = null;
        _repository
            .Setup(r => r.CreateSansthaWithOwnerAsync(It.IsAny<CreateSansthaWithOwnerRequestDto>(), 11, It.IsAny<CancellationToken>()))
            .Callback<CreateSansthaWithOwnerRequestDto, long?, CancellationToken>((dto, _, _) => captured = dto)
            .ReturnsAsync(new SansthaOwnerCreatedDto
            {
                SansthaOrgID = 1,
                SansthaName = "Test Sanstha",
                OwnerUserID = 2,
                OwnerUserName = "9876543210"
            });

        var request = ValidRequest();
        request.SansthaName = "  Test Sanstha  ";
        request.OwnerFirstName = " Ramesh ";
        request.OwnerMiddleName = " Kumar ";
        request.OwnerLastName = " Patil ";
        request.OwnerMobile = " 9876543210 ";
        request.OwnerPassword = " Secret@1 ";

        var (data, error) = await CreateService().CreateSansthaWithOwnerAsync(request, 11);

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal("Test Sanstha", captured?.SansthaName);
        Assert.Equal("Ramesh", captured?.OwnerFirstName);
        Assert.Equal("Kumar", captured?.OwnerMiddleName);
        Assert.Equal("Patil", captured?.OwnerLastName);
        Assert.Equal("9876543210", captured?.OwnerMobile);
        Assert.Equal("Secret@1", captured?.OwnerPassword);
    }

    [Fact]
    public async Task CreateSansthaWithOwnerAsync_ReturnsError_WhenRepositoryReturnsNull()
    {
        _repository
            .Setup(r => r.CreateSansthaWithOwnerAsync(It.IsAny<CreateSansthaWithOwnerRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SansthaOwnerCreatedDto?)null);

        var (data, error) = await CreateService().CreateSansthaWithOwnerAsync(ValidRequest(), 1);

        Assert.Null(data);
        Assert.Equal("Unable to create Sanstha and Owner.", error);
    }
}
