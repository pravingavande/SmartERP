using Microsoft.Extensions.Configuration;
using Moq;
using SmartEPR.Core.DTOs.Auth;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AuthServiceLoginTests
{
    private readonly Mock<IUserRepository> _userRepository = new();

    private AuthService CreateService()
    {
        var config = new Mock<IConfiguration>();
        config.Setup(c => c["Jwt:Secret"]).Returns("SmartEPR-Unit-Test-Secret-Key-Min32Chars!!");
        config.Setup(c => c["Jwt:Issuer"]).Returns("SmartEPR.Api");
        config.Setup(c => c["Jwt:Audience"]).Returns("SmartEPR.Web");
        config.Setup(c => c["Jwt:ExpiryHours"]).Returns("8");
        return new AuthService(_userRepository.Object, config.Object);
    }

    [Theory]
    [InlineData("", "pass")]
    [InlineData("   ", "pass")]
    [InlineData("user", "")]
    [InlineData("user", "   ")]
    public async Task LoginAsync_RejectsBlankUserNameOrPassword(string userName, string password)
    {
        var result = await CreateService().LoginAsync(new LoginRequestDto
        {
            UserName = userName,
            Password = password
        });

        Assert.Null(result);
        _userRepository.Verify(
            r => r.ValidateLoginAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task LoginAsync_TrimsUserNameBeforeValidate()
    {
        string? captured = null;
        _userRepository
            .Setup(r => r.ValidateLoginAsync(It.IsAny<string>(), "Secret@1", It.IsAny<CancellationToken>()))
            .Callback<string, string, CancellationToken>((u, _, _) => captured = u)
            .ReturnsAsync((UserMaster?)null);

        await CreateService().LoginAsync(new LoginRequestDto
        {
            UserName = "  admin  ",
            Password = "Secret@1"
        });

        Assert.Equal("admin", captured);
    }

    [Fact]
    public async Task LoginAsync_ReturnsNull_WhenUserNotFound()
    {
        _userRepository
            .Setup(r => r.ValidateLoginAsync("admin", "x", It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserMaster?)null);

        var result = await CreateService().LoginAsync(new LoginRequestDto
        {
            UserName = "admin",
            Password = "x"
        });

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_ReturnsNull_WhenUserInactive()
    {
        _userRepository
            .Setup(r => r.ValidateLoginAsync("admin", "x", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserMaster
            {
                UserID = 1,
                AppUserName = "admin",
                IsActive = false
            });

        var result = await CreateService().LoginAsync(new LoginRequestDto
        {
            UserName = "admin",
            Password = "x"
        });

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_HappyPath_ReturnsTokenAndUser()
    {
        _userRepository
            .Setup(r => r.ValidateLoginAsync("admin", "Secret@1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserMaster
            {
                UserID = 10,
                AppUserName = "admin",
                Firstname = "Admin",
                LastName = "User",
                IsActive = true
            });
        _userRepository
            .Setup(r => r.GetLoginOrgGroupsByAppUserNameAsync("admin", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<UserLoginOrgGroup>());

        var result = await CreateService().LoginAsync(new LoginRequestDto
        {
            UserName = "admin",
            Password = "Secret@1"
        });

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result!.Token));
        Assert.Equal(10, result.UserId);
        Assert.Equal("admin", result.UserName);
    }
}
