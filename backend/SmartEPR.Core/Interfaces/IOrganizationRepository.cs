using SmartEPR.Core.DTOs.Organization;

namespace SmartEPR.Core.Interfaces;

public interface IOrganizationRepository
{
    Task<OrganizationLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrganizationDocumentOptionDto>> GetDocumentsByBusinessCategoryAsync(int businessCategoryId, CancellationToken cancellationToken = default);
    Task<long?> GetNextSrNoAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrganizationListItemDto>> GetListAsync(OrganizationListFilterDto filter, CancellationToken cancellationToken = default);
    Task<OrganizationDto?> GetByIdAsync(long orgId, CancellationToken cancellationToken = default);
    Task<long?> SaveAsync(SaveOrganizationRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long orgId, CancellationToken cancellationToken = default);
}

public interface IOrganizationService
{
    Task<OrganizationLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrganizationDocumentOptionDto>> GetDocumentsByBusinessCategoryAsync(int businessCategoryId, CancellationToken cancellationToken = default);
    Task<long?> GetNextSrNoAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrganizationListItemDto>> GetListAsync(OrganizationListFilterDto filter, CancellationToken cancellationToken = default);
    Task<OrganizationDto?> GetByIdAsync(long orgId, CancellationToken cancellationToken = default);
    Task<(OrganizationDto? Data, string? Error)> SaveAsync(SaveOrganizationRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteAsync(long orgId, CancellationToken cancellationToken = default);
}
