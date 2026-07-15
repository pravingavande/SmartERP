namespace SmartEPR.Core.DTOs.Organization;

public sealed class OrganizationListFilterDto
{
    public string? Search { get; init; }
    public int? BusinessCategoryID { get; init; }
    public long? SchoolCategoryID { get; init; }
    public long? UnderOrgID { get; init; }
    public string? CityName { get; init; }
    public bool? IsActive { get; init; }
}

public class OrganizationListItemDto
{
    public long OrgID { get; init; }
    public int? BusinessCategoryID { get; init; }
    public string? BusinessCategoryName { get; init; }
    public long? UnderOrgID { get; init; }
    public string? UnderOrgName { get; init; }
    public long? SrNo { get; init; }
    public long? SchoolCategoryID { get; init; }
    public string? SchoolCategoryName { get; init; }
    public string OrganizationName { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? CityName { get; init; }
    public string? UDiesNo { get; init; }
    public string? SchoolTinNo { get; init; }
    public string? SharlarthID { get; init; }
    public string? PanNo { get; init; }
    public string? EmailID { get; init; }
    public string? PhoneNo { get; init; }
    public string? MobileNo { get; init; }
    public string? WebSite { get; init; }
    public string? EstablishmentYear { get; init; }
    public string? RegNo { get; init; }
    public string? Permission80G { get; init; }
    public string? Remark { get; init; }
    public bool IsActive { get; init; }
}

public sealed class OrganizationDto : OrganizationListItemDto
{
    public IReadOnlyList<OrganizationDocumentDto> Documents { get; init; } = Array.Empty<OrganizationDocumentDto>();
}

public sealed class OrganizationDocumentDto
{
    public long? OrgID { get; init; }
    public long DocumentID { get; init; }
    public string? DocumentName { get; init; }
    public string? DocumentPath { get; init; }
}

public sealed class OrganizationDocumentOptionDto
{
    public long DocumentID { get; init; }
    public string DocumentName { get; init; } = string.Empty;
    public int? DocumentTypeID { get; init; }
}

public sealed class IdNameOptionDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class LongIdNameOptionDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class SansthaOrgOptionDto
{
    public long OrgID { get; init; }
    public string OrganizationName { get; init; } = string.Empty;
    public int? BusinessCategoryID { get; init; }
    public long? UnderOrgID { get; init; }
}

public sealed class OrganizationLookupsDto
{
    public IReadOnlyList<IdNameOptionDto> BusinessCategories { get; init; } = Array.Empty<IdNameOptionDto>();
    public IReadOnlyList<LongIdNameOptionDto> SchoolCategories { get; init; } = Array.Empty<LongIdNameOptionDto>();
    public IReadOnlyList<SansthaOrgOptionDto> SansthaOrgs { get; init; } = Array.Empty<SansthaOrgOptionDto>();
}

public sealed class NextSrNoDto
{
    public long NextSrNo { get; init; }
}

public sealed class SaveOrganizationRequestDto
{
    public long? OrgID { get; init; }
    public int BusinessCategoryID { get; init; }
    public long? UnderOrgID { get; init; }
    public long? SchoolCategoryID { get; init; }
    public long? SrNo { get; init; }
    public string OrganizationName { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? CityName { get; init; }
    public string? UDiesNo { get; init; }
    public string? SchoolTinNo { get; init; }
    public string? SharlarthID { get; init; }
    public string? PanNo { get; init; }
    public string? EmailID { get; init; }
    public string? PhoneNo { get; init; }
    public string? MobileNo { get; init; }
    public string? WebSite { get; init; }
    public string? EstablishmentYear { get; init; }
    public string? RegNo { get; init; }
    public string? Permission80G { get; init; }
    public string? Remark { get; init; }
    public bool IsActive { get; init; } = true;
    public IReadOnlyList<SaveOrganizationDocumentDto> Documents { get; init; } = Array.Empty<SaveOrganizationDocumentDto>();
}

public sealed class SaveOrganizationDocumentDto
{
    public long DocumentID { get; init; }
    public string? DocumentPath { get; init; }
}
