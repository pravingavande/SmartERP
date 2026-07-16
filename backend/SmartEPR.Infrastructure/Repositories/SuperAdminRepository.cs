using Dapper;
using SmartEPR.Core.DTOs.SuperAdmin;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class SuperAdminRepository : ISuperAdminRepository
{
    private readonly StoredProcedureExecutor _executor;

    public SuperAdminRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<SuperAdminBusinessCategoryDto>> GetBusinessCategoriesAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<SuperAdminBusinessCategoryDto>("dbo.sp_SuperAdmin_GetBusinessCategories", null, cancellationToken);

    public Task<IReadOnlyList<SansthaOwnerListItemDto>> GetSansthaOwnerListAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<SansthaOwnerListItemDto>("dbo.sp_SuperAdmin_GetSansthaOwnerList", null, cancellationToken);

    public Task<SansthaOwnerCreatedDto?> CreateSansthaWithOwnerAsync(
        CreateSansthaWithOwnerRequestDto request,
        long? createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@SansthaName", request.SansthaName);
        p.Add("@BusinessCategoryID", request.BusinessCategoryID);
        p.Add("@OwnerFirstName", request.OwnerFirstName);
        p.Add("@OwnerMiddleName", request.OwnerMiddleName);
        p.Add("@OwnerLastName", request.OwnerLastName);
        p.Add("@OwnerMobile", request.OwnerMobile);
        p.Add("@OwnerPassword", request.OwnerPassword);
        p.Add("@CreatedByUserID", createdByUserId);
        return _executor.QuerySingleOrDefaultAsync<SansthaOwnerCreatedDto>(
            "dbo.sp_SuperAdmin_CreateSansthaWithOwner", p, cancellationToken);
    }
}
