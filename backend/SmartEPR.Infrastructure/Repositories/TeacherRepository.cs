using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using SmartEPR.Core.DTOs.Teacher;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class TeacherRepository : ITeacherRepository
{
    private static readonly JsonSerializerOptions ChildRowJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly SqlConnectionFactory _connectionFactory;
    private readonly StoredProcedureExecutor _executor;

    public TeacherRepository(SqlConnectionFactory connectionFactory, StoredProcedureExecutor executor)
    {
        _connectionFactory = connectionFactory;
        _executor = executor;
    }

    public async Task<TeacherLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition("dbo.sp_Teacher_GetLookups", commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken))
            .ConfigureAwait(false);

        var staffTypes = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();
        var userRoles = (await multi.ReadAsync<UserRoleRow>().ConfigureAwait(false)).AsList();
        var designations = (await multi.ReadAsync<DesignationRow>().ConfigureAwait(false)).AsList();
        var genders = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var religions = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();
        var categories = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();
        var bloodGroups = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();
        var shifts = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();
        var documents = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var appointmentGroups = new List<AppointmentGroupRow>();
        if (!multi.IsConsumed)
        {
            appointmentGroups = (await multi.ReadAsync<AppointmentGroupRow>().ConfigureAwait(false)).AsList();
        }

        return new TeacherLookupsDto
        {
            StaffTypes = MapIdName(staffTypes, x => x.StaffTypeID, x => x.StaffTypeName),
            UserRoles = userRoles.Select(x => new UserRoleOptionDto { UserRoleID = x.UserRoleID, UserRoleName = x.UserRoleName ?? string.Empty }).ToList(),
            Designations = designations
                .Where(x => x.DesignationCode.HasValue)
                .Select(x => new DesignationOptionDto
                {
                    Code = x.DesignationCode!.Value,
                    Name = x.DesignationName ?? string.Empty,
                    LeaveYear = x.LeaveYear
                })
                .ToList(),
            Genders = MapCodeName(genders, x => x.GenderCode, x => x.GenderName),
            Religions = MapIdName(religions, x => x.ReligionID, x => x.ReligionName),
            Categories = MapIdName(categories, x => x.CategoryID, x => x.CategoryName),
            BloodGroups = MapIdName(bloodGroups, x => x.BloodGroupID, x => x.BloodGroupName),
            Shifts = MapIdName(shifts, x => x.ShiftID, x => x.ShiftName),
            Documents = MapCodeName(documents, x => x.DocumentCode, x => x.DocumentName),
            AppointmentGroups = appointmentGroups
                .Where(x => x.AGID.HasValue)
                .Select(x => new IdNameOptionDto { Id = (int)x.AGID!.Value, Name = x.AGName ?? string.Empty })
                .ToList()
        };
    }

    public Task<IReadOnlyList<TeacherListItemDto>> GetListAsync(TeacherListFilterDto filter, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@Search", filter.Search);
        p.Add("@ShalarthID", filter.ShalarthID);
        p.Add("@MobileNo", filter.MobileNo);
        p.Add("@DesignationCode", filter.DesignationCode);
        p.Add("@Subject", filter.Subject);
        p.Add("@UserRoleID", filter.UserRoleID);
        p.Add("@IsActive", filter.IsActive);
        return _executor.QueryListAsync<TeacherListItemDto>("dbo.sp_Teacher_GetList", p, cancellationToken);
    }

    public async Task<TeacherDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);

        var header = await _executor.QuerySingleOrDefaultAsync<TeacherDto>("dbo.sp_Teacher_GetById", p, cancellationToken).ConfigureAwait(false);
        if (header is null)
            return null;

        var documents = await _executor.QueryListAsync<TeacherDocumentDto>("dbo.sp_Employee_Document_GetByUserId", p, cancellationToken).ConfigureAwait(false);
        var schools = await _executor.QueryListAsync<TeacherSchoolDto>("dbo.sp_Employee_School_GetByUserId", p, cancellationToken).ConfigureAwait(false);

        return new TeacherDto
        {
            UserID = header.UserID,
            SrNo = header.SrNo,
            OrgID = header.OrgID,
            StaffTypeID = header.StaffTypeID,
            UserRoleID = header.UserRoleID,
            DesignationCode = header.DesignationCode,
            Firstname = header.Firstname,
            MiddleName = header.MiddleName,
            LastName = header.LastName,
            EmployeeName = header.EmployeeName,
            EmployeeShortName = header.EmployeeShortName,
            PermanentAddress = header.PermanentAddress,
            CityName = header.CityName,
            PhotoPath = header.PhotoPath,
            GenderCode = header.GenderCode,
            Dob = header.Dob,
            AdharCardNo = header.AdharCardNo,
            NationalCode = header.NationalCode,
            AGID = header.AGID,
            ShalarthID = header.ShalarthID,
            ScaleOfPay = header.ScaleOfPay,
            CasteName = header.CasteName,
            ReligionID = header.ReligionID,
            CategoryID = header.CategoryID,
            BloodGroupID = header.BloodGroupID,
            MobileNo1 = header.MobileNo1,
            MobileNo2 = header.MobileNo2,
            EmailID = header.EmailID,
            PanNo = header.PanNo,
            Remark = header.Remark,
            SubjectName1 = header.SubjectName1,
            SubjectName2 = header.SubjectName2,
            SubjectName3 = header.SubjectName3,
            SQualification = header.SQualification,
            BQualification = header.BQualification,
            AfterDegreePassedSubjects = header.AfterDegreePassedSubjects,
            SansthaOrderNoAndDate = header.SansthaOrderNoAndDate,
            ZPOrderNoAndDate = header.ZPOrderNoAndDate,
            SansthaServiceOrderNoAndDate = header.SansthaServiceOrderNoAndDate,
            ZPServiceOrderNoAndDate = header.ZPServiceOrderNoAndDate,
            DateOfWorkingStart = header.DateOfWorkingStart,
            DoWSCurrentSchool = header.DoWSCurrentSchool,
            JTCategoryID = header.JTCategoryID,
            PaymentGradeDate = header.PaymentGradeDate,
            NivadGradeDate = header.NivadGradeDate,
            RetirementYear = header.RetirementYear,
            ServiceOutDate = header.ServiceOutDate,
            ShiftID = header.ShiftID,
            AppUserName = header.AppUserName,
            AppPassword = header.AppPassword,
            CloseFlag = header.CloseFlag,
            IsActive = header.IsActive,
            CreatedDate = header.CreatedDate,
            ModifiedDate = header.ModifiedDate,
            CreatedUserID = header.CreatedUserID,
            ModifiedUserID = header.ModifiedUserID,
            Documents = documents,
            Schools = schools
        };
    }

    public async Task<int?> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextTeacherSrNoDto>("dbo.sp_Teacher_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo;
    }

    public async Task<bool> IsAppUserNameDuplicateAsync(string appUserName, long? excludeUserId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@AppUserName", appUserName);
        p.Add("@ExcludeUserID", excludeUserId);
        var row = await _executor.QuerySingleOrDefaultAsync<DuplicateRow>("dbo.sp_Teacher_CheckAppUserName", p, cancellationToken).ConfigureAwait(false);
        return row?.IsDuplicate == 1;
    }

    public async Task<long> SaveAsync(long actorUserId, SaveTeacherRequestDto request, bool updatePassword, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", request.UserID > 0 ? request.UserID : null, dbType: DbType.Int64, direction: ParameterDirection.InputOutput);
        p.Add("@ActorUserID", actorUserId > 0 ? actorUserId : null);
        p.Add("@OrgID", request.OrgID);
        p.Add("@SrNo", request.SrNo);
        p.Add("@StaffTypeID", request.StaffTypeID ?? 2);
        p.Add("@UserRoleID", request.UserRoleID);
        p.Add("@DesignationCode", request.DesignationCode);
        p.Add("@Firstname", request.Firstname);
        p.Add("@MiddleName", request.MiddleName);
        p.Add("@LastName", request.LastName);
        p.Add("@EmployeeShortName", request.EmployeeShortName);
        p.Add("@PermanentAddress", request.PermanentAddress);
        p.Add("@CityName", request.CityName);
        p.Add("@PhotoPath", request.PhotoPath);
        p.Add("@GenderCode", request.GenderCode);
        p.Add("@Dob", request.Dob);
        p.Add("@AdharCardNo", request.AdharCardNo);
        p.Add("@NationalCode", request.NationalCode);
        p.Add("@AGID", request.AGID);
        p.Add("@ShalarthID", request.ShalarthID);
        p.Add("@ScaleOfPay", request.ScaleOfPay);
        p.Add("@CasteName", request.CasteName);
        p.Add("@ReligionID", request.ReligionID);
        p.Add("@CategoryID", request.CategoryID);
        p.Add("@BloodGroupID", request.BloodGroupID);
        p.Add("@MobileNo1", request.MobileNo1);
        p.Add("@MobileNo2", request.MobileNo2);
        p.Add("@EmailID", request.EmailID);
        p.Add("@PanNo", request.PanNo);
        p.Add("@Remark", request.Remark);
        p.Add("@SubjectName1", request.SubjectName1);
        p.Add("@SubjectName2", request.SubjectName2);
        p.Add("@SubjectName3", request.SubjectName3);
        p.Add("@SQualification", request.SQualification);
        p.Add("@BQualification", request.BQualification);
        p.Add("@AfterDegreePassedSubjects", request.AfterDegreePassedSubjects);
        p.Add("@SansthaOrderNoAndDate", request.SansthaOrderNoAndDate);
        p.Add("@ZPOrderNoAndDate", request.ZPOrderNoAndDate);
        p.Add("@SansthaServiceOrderNoAndDate", request.SansthaServiceOrderNoAndDate);
        p.Add("@ZPServiceOrderNoAndDate", request.ZPServiceOrderNoAndDate);
        p.Add("@DateOfWorkingStart", request.DateOfWorkingStart);
        p.Add("@DoWSCurrentSchool", request.DoWSCurrentSchool);
        p.Add("@JTCategoryID", request.JTCategoryID);
        p.Add("@PaymentGradeDate", request.PaymentGradeDate);
        p.Add("@NivadGradeDate", request.NivadGradeDate);
        p.Add("@RetirementYear", request.RetirementYear);
        p.Add("@ServiceOutDate", request.ServiceOutDate);
        p.Add("@ShiftID", request.ShiftID);
        p.Add("@AppUserName", request.AppUserName);
        p.Add("@AppPassword", request.AppPassword);
        p.Add("@CloseFlag", request.CloseFlag);
        p.Add("@IsActive", request.IsActive);
        p.Add("@UpdatePassword", updatePassword);
        p.Add("@DocumentsJson", JsonSerializer.Serialize(request.Documents, ChildRowJsonOptions));
        p.Add("@SchoolsJson", JsonSerializer.Serialize(request.Schools, ChildRowJsonOptions));

        await _executor.ExecuteAsync("dbo.sp_Teacher_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@UserID");
    }

    public Task DeleteAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        return _executor.ExecuteAsync("dbo.sp_Teacher_Delete", p, cancellationToken);
    }

    public Task ResetPasswordAsync(long userId, string appPassword, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        p.Add("@AppPassword", appPassword);
        return _executor.ExecuteAsync("dbo.sp_Teacher_ResetPassword", p, cancellationToken);
    }

    private static IReadOnlyList<CodeNameOptionDto> MapCodeName(
        IEnumerable<CodeNameRow> rows,
        Func<CodeNameRow, long?> codeSelector,
        Func<CodeNameRow, string?> nameSelector) =>
        rows.Where(x => codeSelector(x).HasValue)
            .Select(x => new CodeNameOptionDto { Code = codeSelector(x)!.Value, Name = nameSelector(x) ?? string.Empty })
            .ToList();

    private static IReadOnlyList<IdNameOptionDto> MapIdName(
        IEnumerable<IdNameRow> rows,
        Func<IdNameRow, int?> idSelector,
        Func<IdNameRow, string?> nameSelector) =>
        rows.Where(x => idSelector(x).HasValue)
            .Select(x => new IdNameOptionDto { Id = idSelector(x)!.Value, Name = nameSelector(x) ?? string.Empty })
            .ToList();

    private sealed class UserRoleRow
    {
        public int UserRoleID { get; init; }
        public string? UserRoleName { get; init; }
    }

    private sealed class DesignationRow
    {
        public long? DesignationCode { get; init; }
        public string? DesignationName { get; init; }
        public int? LeaveYear { get; init; }
    }

    private sealed class CodeNameRow
    {
        public long? DesignationCode { get; init; }
        public string? DesignationName { get; init; }
        public long? GenderCode { get; init; }
        public string? GenderName { get; init; }
        public long? DocumentCode { get; init; }
        public string? DocumentName { get; init; }
    }

    private sealed class IdNameRow
    {
        public int? StaffTypeID { get; init; }
        public string? StaffTypeName { get; init; }
        public int? ReligionID { get; init; }
        public string? ReligionName { get; init; }
        public int? CategoryID { get; init; }
        public string? CategoryName { get; init; }
        public int? BloodGroupID { get; init; }
        public string? BloodGroupName { get; init; }
        public int? ShiftID { get; init; }
        public string? ShiftName { get; init; }
    }

    private sealed class AppointmentGroupRow
    {
        public long? AGID { get; init; }
        public string? AGName { get; init; }
    }

    private sealed class DuplicateRow
    {
        public int IsDuplicate { get; init; }
    }
}
