namespace SmartEPR.Core.Entities;

/// <summary>
/// Class master (ClassMaster).
/// </summary>
public sealed class ClassMaster
{
    public long ClassID { get; init; }
    public long OrgID { get; init; }
    public long SrNo { get; init; }
    public string ClassName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}
