using SmartEPR.Core.DTOs.SuperAdmin;

namespace SmartEPR.Core.Interfaces;

public interface ISuperAdminRepository
{
    Task<IReadOnlyList<SuperAdminBusinessCategoryDto>> GetBusinessCategoriesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SansthaOwnerListItemDto>> GetSansthaOwnerListAsync(CancellationToken cancellationToken = default);
    Task<SansthaOwnerCreatedDto?> CreateSansthaWithOwnerAsync(CreateSansthaWithOwnerRequestDto request, long? createdByUserId, CancellationToken cancellationToken = default);
}

public interface ISuperAdminService
{
    Task<IReadOnlyList<SuperAdminBusinessCategoryDto>> GetBusinessCategoriesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SansthaOwnerListItemDto>> GetSansthaOwnerListAsync(CancellationToken cancellationToken = default);
    Task<(SansthaOwnerCreatedDto? Data, string? Error)> CreateSansthaWithOwnerAsync(CreateSansthaWithOwnerRequestDto request, long? createdByUserId, CancellationToken cancellationToken = default);
}
