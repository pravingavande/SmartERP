using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.SuperAdmin;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class SuperAdminService : ISuperAdminService
{
    private static readonly Regex MobileRegex = new(@"^\d{10}$", RegexOptions.Compiled);

    private readonly ISuperAdminRepository _repository;

    public SuperAdminService(ISuperAdminRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<SuperAdminBusinessCategoryDto>> GetBusinessCategoriesAsync(CancellationToken cancellationToken = default)
        => _repository.GetBusinessCategoriesAsync(cancellationToken);

    public Task<IReadOnlyList<SansthaOwnerListItemDto>> GetSansthaOwnerListAsync(CancellationToken cancellationToken = default)
        => _repository.GetSansthaOwnerListAsync(cancellationToken);

    public async Task<(SansthaOwnerCreatedDto? Data, string? Error)> CreateSansthaWithOwnerAsync(
        CreateSansthaWithOwnerRequestDto request,
        long? createdByUserId,
        CancellationToken cancellationToken = default)
    {
        request.SansthaName = (request.SansthaName ?? string.Empty).Trim();
        request.OwnerFirstName = (request.OwnerFirstName ?? string.Empty).Trim();
        request.OwnerMiddleName = string.IsNullOrWhiteSpace(request.OwnerMiddleName) ? null : request.OwnerMiddleName.Trim();
        request.OwnerLastName = (request.OwnerLastName ?? string.Empty).Trim();
        request.OwnerMobile = (request.OwnerMobile ?? string.Empty).Trim();
        request.OwnerPassword = (request.OwnerPassword ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(request.SansthaName))
            return (null, "Sanstha name is required.");
        if (string.IsNullOrWhiteSpace(request.OwnerFirstName))
            return (null, "Owner first name is required.");
        if (string.IsNullOrWhiteSpace(request.OwnerLastName))
            return (null, "Owner last name is required.");
        if (!MobileRegex.IsMatch(request.OwnerMobile))
            return (null, "Owner mobile must be exactly 10 digits (used as login username).");
        if (string.IsNullOrWhiteSpace(request.OwnerPassword))
            return (null, "Owner password is required.");
        if (request.BusinessCategoryID is null or <= 0)
            return (null, "Business category is required.");

        try
        {
            var saved = await _repository
                .CreateSansthaWithOwnerAsync(request, createdByUserId, cancellationToken)
                .ConfigureAwait(false);
            return saved is null
                ? (null, "Unable to create Sanstha and Owner.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }
}
