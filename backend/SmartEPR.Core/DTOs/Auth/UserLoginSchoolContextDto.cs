namespace SmartEPR.Core.DTOs.Auth;

public sealed class UserLoginSchoolContextDto
{
    public int SchoolId { get; init; }
    public int SansthaId { get; init; }
    public string AppUserName { get; init; } = string.Empty;
    public string SchoolName { get; init; } = string.Empty;
    public string SansthaName { get; init; } = string.Empty;
}
