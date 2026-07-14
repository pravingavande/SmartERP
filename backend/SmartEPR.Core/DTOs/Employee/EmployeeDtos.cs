namespace SmartEPR.Core.DTOs.Employee;

using System.Text.Json.Serialization;

public sealed class CodeNameOptionDto
{
    public long Code { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class UserRoleOptionDto
{
    public int UserRoleID { get; init; }
    public string UserRoleName { get; init; } = string.Empty;
}

public sealed class EmployeeLookupsDto
{
    public IReadOnlyList<UserRoleOptionDto> UserRoles { get; init; } = [];
    public IReadOnlyList<CodeNameOptionDto> Designations { get; init; } = [];
    public IReadOnlyList<CodeNameOptionDto> Genders { get; init; } = [];
    public IReadOnlyList<CodeNameOptionDto> Educations { get; init; } = [];
    public IReadOnlyList<CodeNameOptionDto> Documents { get; init; } = [];
    public IReadOnlyList<CodeNameOptionDto> QualificationTypes { get; init; } = [];
    public IReadOnlyList<CodeNameOptionDto> EducationStatuses { get; init; } = [];
}

public sealed class EmployeeListItemDto
{
    public long UserID { get; init; }
    public string? Firstname { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public string? EmployeeName { get; init; }
    public string? EmployeeShortName { get; init; }
    public string? MobileNo1 { get; init; }
    public long? OrgID { get; init; }
    public string? OrganizationName { get; init; }
    public long? DesignationCode { get; init; }
    public string? DesignationName { get; init; }
    public int? UserRoleID { get; init; }
    public string? UserRoleName { get; init; }
    public bool? IsActive { get; init; }

    public string DisplayName
    {
        get
        {
            var parts = new[] { Firstname, MiddleName, LastName }.Where(p => !string.IsNullOrWhiteSpace(p));
            return string.Join(' ', parts).Trim();
        }
    }
}

public sealed class EmployeeDto
{
    public long UserID { get; init; }
    public long? SchoolCode { get; init; }
    public long? OrgID { get; init; }
    public int? UserRoleID { get; init; }
    public long? DesignationCode { get; init; }
    public string? Firstname { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public string? EmployeeName { get; init; }
    public string? EmployeeShortName { get; init; }
    public string? PermanentAddress { get; init; }
    public string? LocalAddress { get; init; }
    public long? GenderCode { get; init; }
    public DateTime? Dob { get; init; }
    public string? AdharCardNo { get; init; }
    public string? MobileNo1 { get; init; }
    public string? MobileNo2 { get; init; }
    public string? EmailID { get; init; }
    public string? PanNo { get; init; }
    public string? Remark { get; init; }
    public string? AppUserName { get; init; }
    public string? AppPassword { get; init; }
    public bool? IsActive { get; init; }
    public IReadOnlyList<EmployeeEducationDto> Education { get; init; } = [];
    public IReadOnlyList<EmployeeDocumentDto> Documents { get; init; } = [];
    public IReadOnlyList<EmployeeSchoolDto> Schools { get; init; } = [];
}

public sealed class EmployeeEducationDto
{
    public long UserID { get; init; }
    public long? SrNo { get; init; }
    public long? EducationCodePassExam { get; init; }
    public string? Univercity { get; init; }
    public string? PassingYear { get; init; }
    public string? Percentage { get; init; }
    public long? QualificationTypeCode { get; init; }
    public long? EducationStatusCode { get; init; }
}

public sealed class EmployeeDocumentDto
{
    public long UserID { get; init; }
    public long? EmpDocumentCode { get; init; }
    public string? EmpDocumentPath { get; init; }
}

public sealed class EmployeeSchoolDto
{
    public long TID { get; init; }
    public long? SrNo { get; init; }
    public long? OrgID { get; init; }
    public long? SchoolCode { get; init; }
    public long? DesignationCode { get; init; }
    public string? TeachClass { get; init; }
    public string? TeachSubject { get; init; }
    public DateTime? SchoolJoiningDate { get; init; }
    public DateTime? SchoolLeaveDate { get; init; }
    public string? SansthaTransferOrderNoAndDate { get; init; }
    public string? ZPTransferOrderNoAndDate { get; init; }
}

public sealed class SaveEmployeeRequestDto
{
    public long UserID { get; init; }
    public long? SchoolCode { get; init; }
    public long? OrgID { get; init; }
    public int? UserRoleID { get; init; }
    public long? DesignationCode { get; init; }
    public string? Firstname { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public string? EmployeeShortName { get; init; }
    public string? PermanentAddress { get; init; }
    public string? LocalAddress { get; init; }
    public long? GenderCode { get; init; }
    public DateTime? Dob { get; init; }
    public string? AdharCardNo { get; init; }
    public string? MobileNo1 { get; init; }
    public string? MobileNo2 { get; init; }
    public string? EmailID { get; init; }
    public string? PanNo { get; init; }
    public string? Remark { get; init; }
    public string? AppUserName { get; init; }
    public string? AppPassword { get; init; }
    public bool IsActive { get; init; } = true;
    public IReadOnlyList<SaveEmployeeEducationDto> Education { get; init; } = [];
    public IReadOnlyList<SaveEmployeeDocumentDto> Documents { get; init; } = [];
    public IReadOnlyList<SaveEmployeeSchoolDto> Schools { get; init; } = [];
}

public sealed class SaveEmployeeEducationDto
{
    public long SrNo { get; init; }
    public long? EducationCodePassExam { get; init; }
    public string? Univercity { get; init; }
    public string? PassingYear { get; init; }
    public string? Percentage { get; init; }
    public long? QualificationTypeCode { get; init; }
    public long? EducationStatusCode { get; init; }
}

public sealed class SaveEmployeeDocumentDto
{
    public long? EmpDocumentCode { get; init; }
    public string? EmpDocumentPath { get; init; }
}

public sealed class SaveEmployeeSchoolDto
{
    public long SrNo { get; init; }
    public long? OrgID { get; init; }
    public long? SchoolCode { get; init; }
    public long? DesignationCode { get; init; }
    public string? TeachClass { get; init; }
    public string? TeachSubject { get; init; }
    public DateTime? SchoolJoiningDate { get; init; }
    public DateTime? SchoolLeaveDate { get; init; }
    public string? SansthaTransferOrderNoAndDate { get; init; }

    [JsonPropertyName("zpTransferOrderNoAndDate")]
    public string? ZPTransferOrderNoAndDate { get; init; }
}

public sealed class EmployeeLookupsBundleDto
{
    public EmployeeLookupsDto Lookups { get; init; } = new();
    public IReadOnlyList<SmartEPR.Core.DTOs.Audit.OrgOptionDto> Orgs { get; init; } = [];
}
