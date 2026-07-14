namespace SmartEPR.Core.Entities;

public sealed class UserProfileDetail
{
    public long UserID { get; init; }
    public string AppUserName { get; init; } = string.Empty;
    public string? Firstname { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public string? EmailID { get; init; }
    public string? MobileNo1 { get; init; }
    public string? MobileNo2 { get; init; }
    public long? SchoolCode { get; init; }
    public int? OrgID { get; init; }
    public long? DesignationCode { get; init; }
    public int? UserRoleID { get; init; }
    public long? GenderCode { get; init; }
    public DateTime? Dob { get; init; }
    public string? PanNo { get; init; }
    public string? ShalarthID { get; init; }
    public bool? IsActive { get; init; }
    public string? SansthaName { get; init; }
    public string? SchoolName { get; init; }
    public string? DesignationName { get; init; }

    public bool IsUserActive => IsActive == true;

    public string DisplayName
    {
        get
        {
            var parts = new[] { Firstname, MiddleName, LastName }
                .Where(p => !string.IsNullOrWhiteSpace(p));
            var name = string.Join(' ', parts);
            return string.IsNullOrWhiteSpace(name) ? AppUserName : name.Trim();
        }
    }
}
