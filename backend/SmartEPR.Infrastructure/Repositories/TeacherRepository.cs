using System.Data;
using Dapper;
using SmartEPR.Core.DTOs.Teacher;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class TeacherRepository : ITeacherRepository
{
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
        var designations = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var genders = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var religions = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();
        var categories = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();
        var bloodGroups = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();
        var shifts = (await multi.ReadAsync<IdNameRow>().ConfigureAwait(false)).AsList();

        return new TeacherLookupsDto
        {
            StaffTypes = MapIdName(staffTypes, x => x.StaffTypeID, x => x.StaffTypeName),
            UserRoles = userRoles.Select(x => new UserRoleOptionDto { UserRoleID = x.UserRoleID, UserRoleName = x.UserRoleName ?? string.Empty }).ToList(),
            Designations = MapCodeName(designations, x => x.DesignationCode, x => x.DesignationName),
            Genders = MapCodeName(genders, x => x.GenderCode, x => x.GenderName),
            Religions = MapIdName(religions, x => x.ReligionID, x => x.ReligionName),
            Categories = MapIdName(categories, x => x.CategoryID, x => x.CategoryName),
            BloodGroups = MapIdName(bloodGroups, x => x.BloodGroupID, x => x.BloodGroupName),
            Shifts = MapIdName(shifts, x => x.ShiftID, x => x.ShiftName)
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

    public Task<TeacherDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        return _executor.QuerySingleOrDefaultAsync<TeacherDto>("dbo.sp_Teacher_GetById", p, cancellationToken);
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

    public async Task<long> SaveAsync(SaveTeacherRequestDto request, bool updatePassword, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", request.UserID > 0 ? request.UserID : null, dbType: DbType.Int64, direction: ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@StaffTypeID", request.StaffTypeID ?? 2);
        p.Add("@UserRoleID", request.UserRoleID);
        p.Add("@DesignationCode", request.DesignationCode);
        p.Add("@Firstname", request.Firstname);
        p.Add("@MiddleName", request.MiddleName);
        p.Add("@LastName", request.LastName);
        p.Add("@PermanentAddress", request.PermanentAddress);
        p.Add("@CityName", request.CityName);
        p.Add("@PhotoPath", request.PhotoPath);
        p.Add("@GenderCode", request.GenderCode);
        p.Add("@Dob", request.Dob);
        p.Add("@AdharCardNo", request.AdharCardNo);
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

    private sealed class CodeNameRow
    {
        public long? DesignationCode { get; init; }
        public string? DesignationName { get; init; }
        public long? GenderCode { get; init; }
        public string? GenderName { get; init; }
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

    private sealed class DuplicateRow
    {
        public int IsDuplicate { get; init; }
    }
}
