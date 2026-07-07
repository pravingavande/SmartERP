namespace SmartEPR.Core.Entities;

public sealed class UserMaster
{
    public long UserID { get; init; }
    public string AppUserName { get; init; } = string.Empty;
    public string AppPassword { get; init; } = string.Empty;
    public string? Firstname { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public string? EmailID { get; init; }
    public bool? IsActive { get; init; }

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
