namespace SmartEPR.Core.DTOs.Auth;

public sealed class UserProfileDto
{
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string? FirstName { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public string Email { get; init; } = string.Empty;
    public string? MobileNo1 { get; init; }
    public string? MobileNo2 { get; init; }
    public long? SchoolCode { get; init; }
    public int? OrgId { get; init; }
    public string? SansthaName { get; init; }
    public string? SchoolName { get; init; }
    public string? DesignationName { get; init; }
    public long? DesignationCode { get; init; }
    public int? UserTypeId { get; init; }
    public long? GenderCode { get; init; }
    public DateTime? DateOfBirth { get; init; }
    public string? PanNo { get; init; }
    public string? ShalarthId { get; init; }
    public string RoleCode { get; init; } = "USER";
    public bool IsActive { get; init; }
}
