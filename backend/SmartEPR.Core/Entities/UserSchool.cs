namespace SmartEPR.Core.Entities;

/// <summary>
/// School history row for a user (Employee / Teacher).
/// PK: UserSchoolID. FK to user: UserID (formerly TID).
/// </summary>
public sealed class UserSchool
{
    public long UserSchoolID { get; init; }
    public long? UserID { get; init; }
    public long? SrNo { get; init; }
    public long? OrgID { get; init; }
    public long? DesignationID { get; init; }
    public string? TeachClass { get; init; }
    public string? TeachSubject { get; init; }
    public DateTime? SchoolJoiningDate { get; init; }
    public DateTime? SchoolLeaveDate { get; init; }
}
