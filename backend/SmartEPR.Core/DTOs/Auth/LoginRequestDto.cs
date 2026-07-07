namespace SmartEPR.Core.DTOs.Auth;

public sealed class LoginRequestDto
{
    public string UserName { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
