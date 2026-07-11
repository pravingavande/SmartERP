namespace SmartEPR.Core.Entities;

public sealed class UserLoginOrgGroup
{
    public int OrgID { get; init; }
    public int OrgGroupID { get; init; }
    public string AppUserName { get; init; } = string.Empty;
    public string OrganizationName { get; init; } = string.Empty;
    public string OrganizationGroupName { get; init; } = string.Empty;
    public int? UserTypeID { get; init; }
    public string? UserTypeName { get; init; }
}
