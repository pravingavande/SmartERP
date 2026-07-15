using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using SmartEPR.Core.DTOs.Organization;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class OrganizationRepository : IOrganizationRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly SqlConnectionFactory _connectionFactory;
    private readonly StoredProcedureExecutor _executor;

    public OrganizationRepository(SqlConnectionFactory connectionFactory, StoredProcedureExecutor executor)
    {
        _connectionFactory = connectionFactory;
        _executor = executor;
    }

    public async Task<OrganizationLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition("dbo.sp_Organization_GetLookups", commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken))
            .ConfigureAwait(false);

        var businessCategories = (await multi.ReadAsync<BusinessCategoryRow>().ConfigureAwait(false)).AsList();
        var schoolCategories = (await multi.ReadAsync<SchoolCategoryRow>().ConfigureAwait(false)).AsList();
        var sansthaOrgs = (await multi.ReadAsync<SansthaOrgRow>().ConfigureAwait(false)).AsList();

        return new OrganizationLookupsDto
        {
            BusinessCategories = businessCategories.Select(x => new IdNameOptionDto
            {
                Id = x.BusinessCategoryID,
                Name = x.BusinessCategoryName ?? string.Empty
            }).ToList(),
            SchoolCategories = schoolCategories.Select(x => new LongIdNameOptionDto
            {
                Id = x.SchoolCategoryID,
                Name = x.SchoolCategoryName ?? string.Empty
            }).ToList(),
            SansthaOrgs = sansthaOrgs.Select(x => new SansthaOrgOptionDto
            {
                OrgID = x.OrgID,
                OrganizationName = x.OrganizationName ?? string.Empty,
                BusinessCategoryID = x.BusinessCategoryID,
                UnderOrgID = x.UnderOrgID
            }).ToList()
        };
    }

    public Task<IReadOnlyList<OrganizationDocumentOptionDto>> GetDocumentsByBusinessCategoryAsync(int businessCategoryId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@BusinessCategoryID", businessCategoryId);
        return _executor.QueryListAsync<OrganizationDocumentOptionDto>("dbo.sp_Organization_GetDocumentsByBusinessCategory", p, cancellationToken);
    }

    public async Task<long?> GetNextSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextSrNoDto>("dbo.sp_Organization_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo;
    }

    public Task<IReadOnlyList<OrganizationListItemDto>> GetListAsync(OrganizationListFilterDto filter, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@Search", filter.Search);
        p.Add("@BusinessCategoryID", filter.BusinessCategoryID);
        p.Add("@SchoolCategoryID", filter.SchoolCategoryID);
        p.Add("@UnderOrgID", filter.UnderOrgID);
        p.Add("@CityName", filter.CityName);
        p.Add("@IsActive", filter.IsActive);
        return _executor.QueryListAsync<OrganizationListItemDto>("dbo.sp_Organization_GetList", p, cancellationToken);
    }

    public async Task<OrganizationDto?> GetByIdAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);

        var header = await _executor.QuerySingleOrDefaultAsync<OrganizationDto>("dbo.sp_Organization_GetById", p, cancellationToken).ConfigureAwait(false);
        if (header is null)
            return null;

        var documents = await _executor.QueryListAsync<OrganizationDocumentDto>("dbo.sp_Organization_Document_GetByOrgId", p, cancellationToken).ConfigureAwait(false);

        return new OrganizationDto
        {
            OrgID = header.OrgID,
            BusinessCategoryID = header.BusinessCategoryID,
            BusinessCategoryName = header.BusinessCategoryName,
            UnderOrgID = header.UnderOrgID,
            UnderOrgName = header.UnderOrgName,
            SrNo = header.SrNo,
            SchoolCategoryID = header.SchoolCategoryID,
            SchoolCategoryName = header.SchoolCategoryName,
            OrganizationName = header.OrganizationName,
            Address = header.Address,
            CityName = header.CityName,
            UDiesNo = header.UDiesNo,
            SchoolTinNo = header.SchoolTinNo,
            SharlarthID = header.SharlarthID,
            PanNo = header.PanNo,
            EmailID = header.EmailID,
            PhoneNo = header.PhoneNo,
            MobileNo = header.MobileNo,
            WebSite = header.WebSite,
            EstablishmentYear = header.EstablishmentYear,
            RegNo = header.RegNo,
            Permission80G = header.Permission80G,
            Remark = header.Remark,
            IsActive = header.IsActive,
            Documents = documents
        };
    }

    public async Task<long?> SaveAsync(SaveOrganizationRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", request.OrgID, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@BusinessCategoryID", request.BusinessCategoryID);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@SchoolCategoryID", request.SchoolCategoryID);
        p.Add("@SrNo", request.SrNo);
        p.Add("@OrganizationName", request.OrganizationName);
        p.Add("@Address", request.Address);
        p.Add("@CityName", request.CityName);
        p.Add("@UDiesNo", request.UDiesNo);
        p.Add("@SchoolTinNo", request.SchoolTinNo);
        p.Add("@SharlarthID", request.SharlarthID);
        p.Add("@PanNo", request.PanNo);
        p.Add("@EmailID", request.EmailID);
        p.Add("@PhoneNo", request.PhoneNo);
        p.Add("@MobileNo", request.MobileNo);
        p.Add("@WebSite", request.WebSite);
        p.Add("@EstablishmentYear", request.EstablishmentYear);
        p.Add("@RegNo", request.RegNo);
        p.Add("@Permission80G", request.Permission80G);
        p.Add("@Remark", request.Remark);
        p.Add("@IsActive", request.IsActive);
        p.Add("@DocumentsJson", request.Documents.Count > 0
            ? JsonSerializer.Serialize(request.Documents, JsonOptions)
            : null);

        await _executor.ExecuteAsync("dbo.sp_Organization_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long?>("@OrgID");
    }

    public async Task<bool> DeleteAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        await _executor.ExecuteAsync("dbo.sp_Organization_Delete", p, cancellationToken).ConfigureAwait(false);
        return true;
    }

    private sealed class BusinessCategoryRow
    {
        public int BusinessCategoryID { get; init; }
        public string? BusinessCategoryName { get; init; }
    }

    private sealed class SchoolCategoryRow
    {
        public long SchoolCategoryID { get; init; }
        public string? SchoolCategoryName { get; init; }
    }

    private sealed class SansthaOrgRow
    {
        public long OrgID { get; init; }
        public string? OrganizationName { get; init; }
        public int? BusinessCategoryID { get; init; }
        public long? UnderOrgID { get; init; }
    }
}
