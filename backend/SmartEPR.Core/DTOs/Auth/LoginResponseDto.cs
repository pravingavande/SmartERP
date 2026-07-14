namespace SmartEPR.Core.DTOs.Auth;

public sealed class LoginResponseDto
{
    public string Token { get; init; } = string.Empty;
    public DateTime ExpiresAt { get; init; }
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string RoleCode { get; init; } = string.Empty;
    public int? SchoolId { get; init; }
    public int? SansthaId { get; init; }
    public string? SchoolName { get; init; }
    public string? SansthaName { get; init; }
    public int? UserRoleId { get; init; }
    public string? UserRoleName { get; init; }
    public IReadOnlyList<UserLoginSchoolContextDto> SchoolContexts { get; init; } = Array.Empty<UserLoginSchoolContextDto>();
}
