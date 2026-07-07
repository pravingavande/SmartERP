namespace SmartEPR.Core.DTOs.Auth;

public sealed class LoginResponseDto
{
    public string Token { get; init; } = string.Empty;
    public DateTime ExpiresAt { get; init; }
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string RoleCode { get; init; } = string.Empty;
}
