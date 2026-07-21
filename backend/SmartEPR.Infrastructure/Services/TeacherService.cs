using System.Text.RegularExpressions;
using SmartEPR.Core.DTOs.Teacher;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class TeacherService : ITeacherService
{
    private static readonly Regex MobileRegex = new(@"^\d{10}$", RegexOptions.Compiled);
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex AadharRegex = new(@"^\d{12}$", RegexOptions.Compiled);
    private static readonly Regex PanRegex = new(@"^[A-Z]{5}\d{4}[A-Z]$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private const int TeacherStaffTypeId = 2;

    private readonly ITeacherRepository _teacherRepository;
    private readonly IAuditVoucherRepository _auditRepository;

    public TeacherService(ITeacherRepository teacherRepository, IAuditVoucherRepository auditRepository)
    {
        _teacherRepository = teacherRepository;
        _auditRepository = auditRepository;
    }

    public async Task<TeacherLookupsBundleDto> GetLookupsAsync(long userId, long? underOrgId = null, CancellationToken cancellationToken = default)
    {
        var lookups = await _teacherRepository.GetLookupsAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        var orgs = await _auditRepository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        return new TeacherLookupsBundleDto { Lookups = lookups, Orgs = orgs };
    }

    public Task<IReadOnlyList<TeacherListItemDto>> GetListAsync(TeacherListFilterDto filter, CancellationToken cancellationToken = default)
        => _teacherRepository.GetListAsync(filter, cancellationToken);

    public Task<TeacherDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default)
        => _teacherRepository.GetByIdAsync(userId, cancellationToken);

    public Task<int?> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default)
        => _teacherRepository.GetNextSrNoAsync(orgId, cancellationToken);

    public async Task<(TeacherDto? Data, string? Error)> SaveAsync(long actorUserId, SaveTeacherRequestDto request, CancellationToken cancellationToken = default)
    {
        var error = ValidateSave(request);
        if (error is not null)
            return (null, error);

        if (!string.IsNullOrWhiteSpace(request.AppUserName))
        {
            var duplicate = await _teacherRepository.IsAppUserNameDuplicateAsync(
                request.AppUserName.Trim(),
                request.UserID > 0 ? request.UserID : null,
                cancellationToken).ConfigureAwait(false);
            if (duplicate)
                return (null, "App user name must be unique.");
        }

        var isNew = request.UserID <= 0;
        var updatePassword = isNew || !string.IsNullOrWhiteSpace(request.AppPassword);
        if (isNew && !string.IsNullOrWhiteSpace(request.AppUserName) && string.IsNullOrWhiteSpace(request.AppPassword))
            return (null, "Password is required for app login users.");

        var normalized = NormalizeRequest(request);
        var userId = await _teacherRepository.SaveAsync(actorUserId, normalized, updatePassword, cancellationToken).ConfigureAwait(false);
        var saved = await _teacherRepository.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        return (saved, null);
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(long userId, CancellationToken cancellationToken = default)
    {
        if (userId <= 0)
            return (false, "Invalid teacher id.");

        await _teacherRepository.DeleteAsync(userId, cancellationToken).ConfigureAwait(false);
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> ResetPasswordAsync(long userId, string appPassword, CancellationToken cancellationToken = default)
    {
        if (userId <= 0)
            return (false, "Invalid teacher id.");
        if (string.IsNullOrWhiteSpace(appPassword))
            return (false, "Password is required.");

        await _teacherRepository.ResetPasswordAsync(userId, appPassword.Trim(), cancellationToken).ConfigureAwait(false);
        return (true, null);
    }

    public static string? ValidateSave(SaveTeacherRequestDto request)
    {
        if (!request.OrgID.HasValue || request.OrgID <= 0)
            return "Organization is required.";
        if (string.IsNullOrWhiteSpace(request.Firstname))
            return "First name is required.";
        if (string.IsNullOrWhiteSpace(request.LastName))
            return "Last name is required.";
        if (!request.DesignationCode.HasValue || request.DesignationCode <= 0)
            return "Designation is required.";
        if (!request.StaffTypeID.HasValue || request.StaffTypeID <= 0)
            return "User type is required.";
        if (!request.AGID.HasValue || request.AGID <= 0)
            return "Niyukticha Gut is required.";
        if (!request.GenderCode.HasValue || request.GenderCode <= 0)
            return "Gender is required.";
        if (string.IsNullOrWhiteSpace(request.MobileNo1))
            return "Mobile no. 1 is required.";
        if (!IsAllowedMobile(request.MobileNo1))
            return "Mobile no. 1 must be a 10-digit number or 0.";
        if (!string.IsNullOrWhiteSpace(request.MobileNo2) && !IsAllowedMobile(request.MobileNo2))
            return "Mobile no. 2 must be a 10-digit number or 0.";
        if (!string.IsNullOrWhiteSpace(request.EmailID) && !EmailRegex.IsMatch(request.EmailID.Trim()))
            return "Email ID format is invalid.";
        if (!string.IsNullOrWhiteSpace(request.AdharCardNo) && !IsAllowedAadhar(request.AdharCardNo))
            return "Aadhar card no. must be 12 digits, 0, or -.";
        if (!string.IsNullOrWhiteSpace(request.PanNo) && !PanRegex.IsMatch(request.PanNo.Trim().ToUpperInvariant()))
            return "PAN no. format is invalid.";
        if (request.RetirementYear.HasValue && request.RetirementYear < 0)
            return "Retirement year must be numeric.";
        return null;
    }

    private static bool IsAllowedMobile(string value)
    {
        var trimmed = value.Trim();
        return trimmed == "0" || MobileRegex.IsMatch(trimmed);
    }

    private static bool IsAllowedAadhar(string value)
    {
        var trimmed = value.Trim();
        return trimmed == "0" || trimmed == "-" || AadharRegex.IsMatch(trimmed);
    }

    private static SaveTeacherRequestDto NormalizeRequest(SaveTeacherRequestDto request) => new()
    {
        UserID = request.UserID,
        OrgID = request.OrgID,
        StaffTypeID = request.StaffTypeID ?? TeacherStaffTypeId,
        UserRoleID = request.UserRoleID,
        DesignationCode = request.DesignationCode,
        Firstname = Trim(request.Firstname),
        MiddleName = Trim(request.MiddleName),
        LastName = Trim(request.LastName),
        EmployeeShortName = Trim(request.EmployeeShortName),
        PermanentAddress = Trim(request.PermanentAddress),
        CityName = Trim(request.CityName),
        PhotoPath = Trim(request.PhotoPath),
        GenderCode = request.GenderCode,
        Dob = request.Dob,
        AdharCardNo = Trim(request.AdharCardNo),
        NationalCode = Trim(request.NationalCode),
        AGID = request.AGID,
        ShalarthID = Trim(request.ShalarthID),
        ScaleOfPay = Trim(request.ScaleOfPay),
        CasteName = Trim(request.CasteName),
        ReligionID = request.ReligionID,
        CategoryID = request.CategoryID,
        BloodGroupID = request.BloodGroupID,
        MobileNo1 = Trim(request.MobileNo1),
        MobileNo2 = Trim(request.MobileNo2),
        EmailID = Trim(request.EmailID),
        PanNo = Trim(request.PanNo)?.ToUpperInvariant(),
        Remark = Trim(request.Remark),
        SubjectName1 = Trim(request.SubjectName1),
        SubjectName2 = Trim(request.SubjectName2),
        SubjectName3 = Trim(request.SubjectName3),
        SQualification = Trim(request.SQualification),
        BQualification = Trim(request.BQualification),
        AfterDegreePassedSubjects = Trim(request.AfterDegreePassedSubjects),
        SansthaOrderNoAndDate = Trim(request.SansthaOrderNoAndDate),
        ZPOrderNoAndDate = Trim(request.ZPOrderNoAndDate),
        SansthaServiceOrderNoAndDate = Trim(request.SansthaServiceOrderNoAndDate),
        ZPServiceOrderNoAndDate = Trim(request.ZPServiceOrderNoAndDate),
        DateOfWorkingStart = request.DateOfWorkingStart,
        DoWSCurrentSchool = request.DoWSCurrentSchool,
        JTCategoryID = request.JTCategoryID,
        PaymentGradeDate = request.PaymentGradeDate,
        NivadGradeDate = request.NivadGradeDate,
        RetirementYear = request.RetirementYear,
        ServiceOutDate = request.ServiceOutDate,
        ShiftID = request.ShiftID,
        AppUserName = Trim(request.AppUserName),
        AppPassword = request.AppPassword,
        CloseFlag = request.CloseFlag,
        IsActive = request.IsActive,
        SrNo = request.SrNo,
        Documents = request.Documents,
        Schools = request.Schools
    };

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
