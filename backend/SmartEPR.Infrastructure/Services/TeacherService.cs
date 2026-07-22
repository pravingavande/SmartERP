using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
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

    public async Task<(TeacherDto? Data, string? Error)> SaveDocumentsAsync(
        long actorUserId,
        long userId,
        IReadOnlyList<SaveTeacherDocumentDto> documents,
        CancellationToken cancellationToken = default)
    {
        if (userId <= 0)
            return (null, "Teacher not found.");

        var validationError = ValidateDocumentsSave(documents);
        if (validationError is not null)
            return (null, validationError);

        try
        {
            await _teacherRepository.SaveDocumentsAsync(userId, documents, cancellationToken).ConfigureAwait(false);
            var saved = await _teacherRepository.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
            return saved is null ? (null, "Documents saved but could not be reloaded.") : (saved, null);
        }
        catch (SqlException ex) when (IsMissingSaveDocumentsProcedure(ex))
        {
            return await SaveDocumentsViaFullTeacherSaveAsync(actorUserId, userId, documents, cancellationToken).ConfigureAwait(false);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    private async Task<(TeacherDto? Data, string? Error)> SaveDocumentsViaFullTeacherSaveAsync(
        long actorUserId,
        long userId,
        IReadOnlyList<SaveTeacherDocumentDto> documents,
        CancellationToken cancellationToken)
    {
        var existing = await _teacherRepository.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        if (existing is null)
            return (null, "Teacher not found.");

        var request = MapToSaveRequest(existing, documents);
        return await SaveAsync(actorUserId, request, cancellationToken).ConfigureAwait(false);
    }

    private static bool IsMissingSaveDocumentsProcedure(SqlException ex) =>
        ex.Number is 2812 or 208
        || ex.Message.Contains("sp_Teacher_SaveDocuments", StringComparison.OrdinalIgnoreCase);

    private static SaveTeacherRequestDto MapToSaveRequest(TeacherDto teacher, IReadOnlyList<SaveTeacherDocumentDto> documents) => new()
    {
        UserID = teacher.UserID,
        OrgID = teacher.OrgID,
        SrNo = teacher.SrNo,
        StaffTypeID = teacher.StaffTypeID,
        UserRoleID = teacher.UserRoleID,
        DesignationCode = teacher.DesignationCode,
        Firstname = teacher.Firstname,
        MiddleName = teacher.MiddleName,
        LastName = teacher.LastName,
        EmployeeShortName = teacher.EmployeeShortName,
        PermanentAddress = teacher.PermanentAddress,
        CityName = teacher.CityName,
        PhotoPath = teacher.PhotoPath,
        GenderCode = teacher.GenderCode,
        Dob = teacher.Dob,
        AdharCardNo = teacher.AdharCardNo,
        NationalCode = teacher.NationalCode,
        AGID = teacher.AGID,
        ShalarthID = teacher.ShalarthID,
        ScaleOfPay = teacher.ScaleOfPay,
        CasteName = teacher.CasteName,
        ReligionID = teacher.ReligionID,
        CategoryID = teacher.CategoryID,
        BloodGroupID = teacher.BloodGroupID,
        MobileNo1 = teacher.MobileNo1,
        MobileNo2 = teacher.MobileNo2,
        EmailID = teacher.EmailID,
        PanNo = teacher.PanNo,
        Remark = teacher.Remark,
        SubjectName1 = teacher.SubjectName1,
        SubjectName2 = teacher.SubjectName2,
        SubjectName3 = teacher.SubjectName3,
        SQualification = teacher.SQualification,
        BQualification = teacher.BQualification,
        AfterDegreePassedSubjects = teacher.AfterDegreePassedSubjects,
        SansthaOrderNoAndDate = teacher.SansthaOrderNoAndDate,
        ZPOrderNoAndDate = teacher.ZPOrderNoAndDate,
        SansthaServiceOrderNoAndDate = teacher.SansthaServiceOrderNoAndDate,
        ZPServiceOrderNoAndDate = teacher.ZPServiceOrderNoAndDate,
        DateOfWorkingStart = teacher.DateOfWorkingStart,
        DoWSCurrentSchool = teacher.DoWSCurrentSchool,
        JTCategoryID = teacher.JTCategoryID,
        PaymentGradeDate = teacher.PaymentGradeDate,
        NivadGradeDate = teacher.NivadGradeDate,
        RetirementYear = teacher.RetirementYear,
        ServiceOutDate = teacher.ServiceOutDate,
        ShiftID = teacher.ShiftID,
        AppUserName = teacher.AppUserName,
        CloseFlag = teacher.CloseFlag ?? false,
        IsActive = teacher.IsActive ?? true,
        Documents = documents,
        Schools = teacher.Schools.Select(s => new SaveTeacherSchoolDto
        {
            SrNo = s.SrNo ?? 0,
            OrgID = s.OrgID,
            SchoolCode = s.SchoolCode,
            DesignationCode = s.DesignationCode,
            TeachClass = s.TeachClass,
            TeachSubject = s.TeachSubject,
            SchoolJoiningDate = s.SchoolJoiningDate,
            SchoolLeaveDate = s.SchoolLeaveDate,
            SansthaTransferOrderNoAndDate = s.SansthaTransferOrderNoAndDate,
            ZPTransferOrderNoAndDate = s.ZPTransferOrderNoAndDate
        }).ToList()
    };

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

    public static string? ValidateDocumentsSave(IReadOnlyList<SaveTeacherDocumentDto> documents)
    {
        foreach (var doc in documents)
        {
            if (!doc.EmpDocumentCode.HasValue || doc.EmpDocumentCode <= 0)
                return "Select document type for each uploaded file.";
            if (string.IsNullOrWhiteSpace(doc.EmpDocumentPath))
                return "Upload a file for each selected document type.";
        }

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
