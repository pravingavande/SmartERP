namespace SmartEPR.Core.DTOs.Leave;

using SmartEPR.Core.DTOs.Audit;

public sealed class LeaveTypeDto
{
    public long LeaveTypeID { get; init; }
    public string LeaveTypeName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public sealed class SaveLeaveTypeRequestDto
{
    public long LeaveTypeID { get; init; }
    public string LeaveTypeName { get; init; } = string.Empty;
    public bool IsActive { get; init; } = true;
}

public sealed class LeaveOptionDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class AyOptionDto
{
    public long AyID { get; init; }
    public string AyName { get; init; } = string.Empty;
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
}

public sealed class LeaveApplyLookupsDto
{
    public IReadOnlyList<LeaveOptionDto> LeaveTypes { get; init; } = [];
    public IReadOnlyList<LeaveOptionDto> LeavePermissions { get; init; } = [];
    public IReadOnlyList<AyOptionDto> AyList { get; init; } = [];
}

public sealed class LeaveApplyLookupsBundleDto
{
    public OrgOptionDto[] Orgs { get; init; } = [];
    public LeaveApplyLookupsDto Lookups { get; init; } = new();
}

public sealed class EmployeeOptionDto
{
    public long UserID { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string? MobileNo1 { get; init; }
}

public sealed class LeaveApplyListItemDto
{
    public long UserLeaveApplyID { get; init; }
    public long? OrgID { get; init; }
    public string? OrganizationName { get; init; }
    public long? RecordNo { get; init; }
    public DateTime? TDate { get; init; }
    public long? UserID { get; init; }
    public string? Firstname { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public long? LeaveTypeID { get; init; }
    public string? LeaveTypeName { get; init; }
    public string? LeaveReason { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public int? NoOfDay { get; init; }
    public string? AdminRemak { get; init; }
    public long? LeavePermissionID { get; init; }
    public string? LeavePermissionName { get; init; }
    public long? AyID { get; init; }
    public string? AyName { get; init; }

    public string DisplayName
    {
        get
        {
            var parts = new[] { Firstname, MiddleName, LastName }.Where(p => !string.IsNullOrWhiteSpace(p));
            return string.Join(' ', parts).Trim();
        }
    }
}

public sealed class LeaveApplyDto
{
    public long UserLeaveApplyID { get; init; }
    public long? OrgID { get; init; }
    public long? RecordNo { get; init; }
    public DateTime? TDate { get; init; }
    public long? UserID { get; init; }
    public long? LeaveTypeID { get; init; }
    public string? LeaveReason { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public int? NoOfDay { get; init; }
    public string? AdminRemak { get; init; }
    public long? LeavePermissionID { get; init; }
    public long? AyID { get; init; }
}

public sealed class SaveLeaveApplyRequestDto
{
    public long UserLeaveApplyID { get; init; }
    public long? OrgID { get; init; }
    public long? RecordNo { get; init; }
    public DateTime? TDate { get; init; }
    public long? UserID { get; init; }
    public long? LeaveTypeID { get; init; }
    public string? LeaveReason { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public string? AdminRemak { get; init; }
    public long? LeavePermissionID { get; init; }
    public long? AyID { get; init; }
}

public sealed class NextRecordNoDto
{
    public long NextRecordNo { get; init; }
}
