using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Employee;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class EmployeeRepository : IEmployeeRepository
{
    private static readonly JsonSerializerOptions ChildRowJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly SqlConnectionFactory _connectionFactory;
    private readonly StoredProcedureExecutor _executor;

    public EmployeeRepository(SqlConnectionFactory connectionFactory, StoredProcedureExecutor executor)
    {
        _connectionFactory = connectionFactory;
        _executor = executor;
    }

    public async Task<EmployeeLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_Employee_GetLookups",
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var userRoles = (await multi.ReadAsync<UserRoleRow>().ConfigureAwait(false)).AsList();
        var designations = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var genders = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var educations = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var documents = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var qualificationTypes = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();
        var educationStatuses = (await multi.ReadAsync<CodeNameRow>().ConfigureAwait(false)).AsList();

        return new EmployeeLookupsDto
        {
            UserRoles = userRoles.Select(x => new UserRoleOptionDto { UserRoleID = x.UserRoleID, UserRoleName = x.UserRoleName ?? string.Empty }).ToList(),
            Designations = MapCodeName(designations, x => x.DesignationCode, x => x.DesignationName),
            Genders = MapCodeName(genders, x => x.GenderCode, x => x.GenderName),
            Educations = MapCodeName(educations, x => x.EducationCode, x => x.EducationName),
            Documents = MapCodeName(documents, x => x.DocumentCode, x => x.DocumentName),
            QualificationTypes = MapCodeName(qualificationTypes, x => x.QualificationTypeCode, x => x.QualificationTypeName),
            EducationStatuses = MapCodeName(educationStatuses, x => x.EducationStatusCode, x => x.EducationStatusName)
        };
    }

    public Task<IReadOnlyList<EmployeeListItemDto>> GetListAsync(long? orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<EmployeeListItemDto>("dbo.sp_Employee_GetList", p, cancellationToken);
    }

    public async Task<EmployeeDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);

        var header = await _executor.QuerySingleOrDefaultAsync<EmployeeDto>("dbo.sp_Employee_GetById", p, cancellationToken).ConfigureAwait(false);
        if (header is null)
            return null;

        var education = await _executor.QueryListAsync<EmployeeEducationDto>("dbo.sp_Employee_Education_GetByUserId", p, cancellationToken).ConfigureAwait(false);
        var documents = await _executor.QueryListAsync<EmployeeDocumentDto>("dbo.sp_Employee_Document_GetByUserId", p, cancellationToken).ConfigureAwait(false);
        var schools = await _executor.QueryListAsync<EmployeeSchoolDto>("dbo.sp_Employee_School_GetByUserId", p, cancellationToken).ConfigureAwait(false);

        return new EmployeeDto
        {
            UserID = header.UserID,
            SchoolCode = header.SchoolCode,
            OrgID = header.OrgID,
            UserRoleID = header.UserRoleID,
            DesignationCode = header.DesignationCode,
            Firstname = header.Firstname,
            MiddleName = header.MiddleName,
            LastName = header.LastName,
            EmployeeName = header.EmployeeName,
            EmployeeShortName = header.EmployeeShortName,
            PermanentAddress = header.PermanentAddress,
            LocalAddress = header.LocalAddress,
            GenderCode = header.GenderCode,
            Dob = header.Dob,
            AdharCardNo = header.AdharCardNo,
            MobileNo1 = header.MobileNo1,
            MobileNo2 = header.MobileNo2,
            EmailID = header.EmailID,
            PanNo = header.PanNo,
            Remark = header.Remark,
            AppUserName = header.AppUserName,
            AppPassword = header.AppPassword,
            IsActive = header.IsActive,
            CreatedDate = header.CreatedDate,
            ModifiedDate = header.ModifiedDate,
            CreatedUserID = header.CreatedUserID,
            ModifiedUserID = header.ModifiedUserID,
            Education = education,
            Documents = documents,
            Schools = schools
        };
    }

    public async Task<long> SaveAsync(long actorUserId, SaveEmployeeRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", request.UserID > 0 ? request.UserID : null, dbType: DbType.Int64, direction: ParameterDirection.InputOutput);
        p.Add("@ActorUserID", actorUserId > 0 ? actorUserId : null);
        p.Add("@SchoolCode", request.SchoolCode);
        p.Add("@OrgID", request.OrgID);
        p.Add("@UserRoleID", request.UserRoleID);
        p.Add("@DesignationCode", request.DesignationCode);
        p.Add("@Firstname", request.Firstname);
        p.Add("@MiddleName", request.MiddleName);
        p.Add("@LastName", request.LastName);
        p.Add("@EmployeeShortName", request.EmployeeShortName);
        p.Add("@PermanentAddress", request.PermanentAddress);
        p.Add("@LocalAddress", request.LocalAddress);
        p.Add("@GenderCode", request.GenderCode);
        p.Add("@Dob", request.Dob);
        p.Add("@AdharCardNo", request.AdharCardNo);
        p.Add("@MobileNo1", request.MobileNo1);
        p.Add("@MobileNo2", request.MobileNo2);
        p.Add("@EmailID", request.EmailID);
        p.Add("@PanNo", request.PanNo);
        p.Add("@Remark", request.Remark);
        p.Add("@AppUserName", request.AppUserName);
        p.Add("@AppPassword", request.AppPassword);
        p.Add("@IsActive", request.IsActive);
        p.Add("@EducationJson", JsonSerializer.Serialize(request.Education, ChildRowJsonOptions));
        p.Add("@DocumentsJson", JsonSerializer.Serialize(request.Documents, ChildRowJsonOptions));
        p.Add("@SchoolsJson", JsonSerializer.Serialize(request.Schools, ChildRowJsonOptions));

        await _executor.ExecuteAsync("dbo.sp_Employee_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@UserID");
    }

    private static IReadOnlyList<CodeNameOptionDto> MapCodeName(
        IEnumerable<CodeNameRow> rows,
        Func<CodeNameRow, long?> codeSelector,
        Func<CodeNameRow, string?> nameSelector) =>
        rows
            .Where(x => codeSelector(x).HasValue)
            .Select(x => new CodeNameOptionDto
            {
                Code = codeSelector(x)!.Value,
                Name = nameSelector(x) ?? string.Empty
            })
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
        public long? EducationCode { get; init; }
        public string? EducationName { get; init; }
        public long? DocumentCode { get; init; }
        public string? DocumentName { get; init; }
        public long? QualificationTypeCode { get; init; }
        public string? QualificationTypeName { get; init; }
        public long? EducationStatusCode { get; init; }
        public string? EducationStatusName { get; init; }
    }
}
