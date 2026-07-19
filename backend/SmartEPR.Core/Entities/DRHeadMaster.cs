namespace SmartEPR.Core.Entities;

/// <summary>
/// Donation head master (DRHeadMaster).
/// UnderOrgID represents Organization ID.
/// </summary>
public sealed class DRHeadMaster
{
    public long DRHeadID { get; init; }
    public long UnderOrgID { get; init; }
    public long SrNo { get; init; }
    public string DRHeadName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}
