namespace SmartEPR.Core.Entities;

/// <summary>
/// Account register master (ACAccountRegisterMaster).
/// UnderOrgID represents Organization ID.
/// </summary>
public sealed class ACAccountRegisterMaster
{
    public long AccountRegisterID { get; init; }
    public long UnderOrgID { get; init; }
    public long SrNo { get; init; }
    public string AccountRegister { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}
