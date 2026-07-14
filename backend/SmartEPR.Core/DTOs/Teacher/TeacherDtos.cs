namespace SmartEPR.Core.DTOs.Teacher;

public sealed class CodeNameOptionDto
{
    public long Code { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class IdNameOptionDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class UserRoleOptionDto
{
    public int UserRoleID { get; init; }
    public string UserRoleName { get; init; } = string.Empty;
}

public sealed class TeacherLookupsDto
{
    public IReadOnlyList<IdNameOptionDto> StaffTypes { get; init; } = [];
    public IReadOnlyList<UserRoleOptionDto> UserRoles { get; init; } = [];
    public IReadOnlyList<CodeNameOptionDto> Designations { get; init; } = [];
    public IReadOnlyList<CodeNameOptionDto> Genders { get; init; } = [];
    public IReadOnlyList<IdNameOptionDto> Religions { get; init; } = [];
    public IReadOnlyList<IdNameOptionDto> Categories { get; init; } = [];
    public IReadOnlyList<IdNameOptionDto> BloodGroups { get; init; } = [];
    public IReadOnlyList<IdNameOptionDto> Shifts { get; init; } = [];
}

public sealed class TeacherLookupsBundleDto
{
    public TeacherLookupsDto Lookups { get; init; } = new();
    public IReadOnlyList<SmartEPR.Core.DTOs.Audit.OrgOptionDto> Orgs { get; init; } = [];
}

public sealed class TeacherListFilterDto
{
    public long? OrgID { get; init; }
    public string? Search { get; init; }
    public string? ShalarthID { get; init; }
    public string? MobileNo { get; init; }
    public long? DesignationCode { get; init; }
    public string? Subject { get; init; }
    public int? UserRoleID { get; init; }
    public bool? IsActive { get; init; }
}

public sealed class TeacherListItemDto
{
    public long UserID { get; init; }
    public int? SrNo { get; init; }
    public string? Firstname { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public string? MobileNo1 { get; init; }
    public string? ShalarthID { get; init; }
    public long? OrgID { get; init; }
    public string? OrganizationName { get; init; }
    public long? DesignationCode { get; init; }
    public string? DesignationName { get; init; }
    public int? UserRoleID { get; init; }
    public string? UserRoleName { get; init; }
    public int? StaffTypeID { get; init; }
    public string? StaffTypeName { get; init; }
    public string? SubjectName1 { get; init; }
    public string? SubjectName2 { get; init; }
    public string? SubjectName3 { get; init; }
    public bool? IsActive { get; init; }
    public string? PhotoPath { get; init; }

    public string DisplayName
    {
        get
        {
            var parts = new[] { Firstname, MiddleName, LastName }.Where(p => !string.IsNullOrWhiteSpace(p));
            return string.Join(' ', parts).Trim();
        }
    }
}

public sealed class TeacherDto
{
    public long UserID { get; init; }
    public int? SrNo { get; init; }
    public long? OrgID { get; init; }
    public int? StaffTypeID { get; init; }
    public int? UserRoleID { get; init; }
    public long? DesignationCode { get; init; }
    public string? Firstname { get; init; }
    public string? MiddleName { get; init; }
    public string? LastName { get; init; }
    public string? PermanentAddress { get; init; }
    public string? CityName { get; init; }
    public string? PhotoPath { get; init; }
    public long? GenderCode { get; init; }
    public DateTime? Dob { get; init; }
    public string? AdharCardNo { get; init; }
    public string? ShalarthID { get; init; }
    public string? ScaleOfPay { get; init; }
    public string? CasteName { get; init; }
    public int? ReligionID { get; init; }
    public int? CategoryID { get; init; }
    public int? BloodGroupID { get; init; }
    public string? MobileNo1 { get; init; }
    public string? MobileNo2 { get; init; }
    public string? EmailID { get; init; }
    public string? PanNo { get; init; }
    public string? Remark { get; init; }
    public string? SubjectName1 { get; init; }
    public string? SubjectName2 { get; init; }
    public string? SubjectName3 { get; init; }
    public string? SQualification { get; init; }
    public string? BQualification { get; init; }
    public string? AfterDegreePassedSubjects { get; init; }
    public string? SansthaOrderNoAndDate { get; init; }
    public string? ZPOrderNoAndDate { get; init; }
    public string? SansthaServiceOrderNoAndDate { get; init; }
    public string? ZPServiceOrderNoAndDate { get; init; }
    public DateTime? DateOfWorkingStart { get; init; }
    public int? JTCategoryID { get; init; }
    public DateTime? PaymentGradeDate { get; init; }
    public DateTime? NivadGradeDate { get; init; }
    public int? RetirementYear { get; init; }
    public DateTime? ServiceOutDate { get; init; }
    public int? ShiftID { get; init; }
    public string? AppUserName { get; init; }
    public string? AppPassword { get; init; }
    public bool? CloseFlag { get; init; }
    public bool? IsActive { get; init; }
    public DateTime? CreatedAt { get; init; }
}

public sealed class SaveTeacherRequestDto
{
    public long UserID { get; set; }
    public long? OrgID { get; set; }
    public int? StaffTypeID { get; set; }
    public int? UserRoleID { get; set; }
    public long? DesignationCode { get; set; }
    public string? Firstname { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? PermanentAddress { get; set; }
    public string? CityName { get; set; }
    public string? PhotoPath { get; set; }
    public long? GenderCode { get; set; }
    public DateTime? Dob { get; set; }
    public string? AdharCardNo { get; set; }
    public string? ShalarthID { get; set; }
    public string? ScaleOfPay { get; set; }
    public string? CasteName { get; set; }
    public int? ReligionID { get; set; }
    public int? CategoryID { get; set; }
    public int? BloodGroupID { get; set; }
    public string? MobileNo1 { get; set; }
    public string? MobileNo2 { get; set; }
    public string? EmailID { get; set; }
    public string? PanNo { get; set; }
    public string? Remark { get; set; }
    public string? SubjectName1 { get; set; }
    public string? SubjectName2 { get; set; }
    public string? SubjectName3 { get; set; }
    public string? SQualification { get; set; }
    public string? BQualification { get; set; }
    public string? AfterDegreePassedSubjects { get; set; }
    public string? SansthaOrderNoAndDate { get; set; }
    public string? ZPOrderNoAndDate { get; set; }
    public string? SansthaServiceOrderNoAndDate { get; set; }
    public string? ZPServiceOrderNoAndDate { get; set; }
    public DateTime? DateOfWorkingStart { get; set; }
    public int? JTCategoryID { get; set; }
    public DateTime? PaymentGradeDate { get; set; }
    public DateTime? NivadGradeDate { get; set; }
    public int? RetirementYear { get; set; }
    public DateTime? ServiceOutDate { get; set; }
    public int? ShiftID { get; set; }
    public string? AppUserName { get; set; }
    public string? AppPassword { get; set; }
    public bool CloseFlag { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class ResetTeacherPasswordRequestDto
{
    public string AppPassword { get; init; } = string.Empty;
}

public sealed class NextTeacherSrNoDto
{
    public int NextSrNo { get; init; }
}
