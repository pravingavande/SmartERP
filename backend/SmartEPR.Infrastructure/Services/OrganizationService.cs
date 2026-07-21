using System.Text.RegularExpressions;
using SmartEPR.Core.DTOs.Organization;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class OrganizationService : IOrganizationService
{
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PanRegex = new(@"^[A-Z]{5}[0-9]{4}[A-Z]$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MobileRegex = new(@"^\d{10}$", RegexOptions.Compiled);
    private static readonly Regex PhoneRegex = new(@"^\d+$", RegexOptions.Compiled);
    private static readonly Regex YearRegex = new(@"^\d{4}$", RegexOptions.Compiled);

    private readonly IOrganizationRepository _repository;
    private readonly IAuditVoucherRepository _auditRepository;

    public OrganizationService(IOrganizationRepository repository, IAuditVoucherRepository auditRepository)
    {
        _repository = repository;
        _auditRepository = auditRepository;
    }

    public async Task<OrganizationLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var lookups = await _repository.GetLookupsAsync(cancellationToken).ConfigureAwait(false);
        // Same school org source as Teacher Master
        var orgs = await _auditRepository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        return new OrganizationLookupsDto
        {
            BusinessCategories = lookups.BusinessCategories,
            SchoolCategories = lookups.SchoolCategories,
            Orgs = orgs,
            SansthaOrgs = lookups.SansthaOrgs
        };
    }

    public Task<IReadOnlyList<OrganizationDocumentOptionDto>> GetDocumentsByBusinessCategoryAsync(int businessCategoryId, long underOrgId, CancellationToken cancellationToken = default)
    {
        if (underOrgId <= 0)
            return Task.FromResult<IReadOnlyList<OrganizationDocumentOptionDto>>(Array.Empty<OrganizationDocumentOptionDto>());
        return _repository.GetDocumentsByBusinessCategoryAsync(businessCategoryId, underOrgId, cancellationToken);
    }

    public Task<long?> GetNextSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
        => _repository.GetNextSrNoAsync(underOrgId, cancellationToken);

    public Task<IReadOnlyList<OrganizationListItemDto>> GetListAsync(OrganizationListFilterDto filter, CancellationToken cancellationToken = default)
        => _repository.GetListAsync(filter, cancellationToken);

    public Task<OrganizationDto?> GetByIdAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetByIdAsync(orgId, cancellationToken);

    public async Task<(OrganizationDto? Data, string? Error)> SaveAsync(SaveOrganizationRequestDto request, CancellationToken cancellationToken = default)
    {
        var validationError = ValidateSave(request);
        if (validationError is not null)
            return (null, validationError);

        var normalized = NormalizeRequest(request);
        var orgId = await _repository.SaveAsync(normalized, cancellationToken).ConfigureAwait(false);
        if (orgId is null or <= 0)
            return (null, "Unable to save organization.");

        var saved = await _repository.GetByIdAsync(orgId.Value, cancellationToken).ConfigureAwait(false);
        return saved is null ? (null, "Organization saved but could not be reloaded.") : (saved, null);
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(long orgId, CancellationToken cancellationToken = default)
    {
        if (orgId <= 0)
            return (false, "Organization not found.");

        await _repository.DeleteAsync(orgId, cancellationToken).ConfigureAwait(false);
        return (true, null);
    }

    public static string? ValidateSave(SaveOrganizationRequestDto request)
    {
        if (request.BusinessCategoryID <= 0)
            return "Business Category is required.";

        if (string.IsNullOrWhiteSpace(request.OrganizationName))
            return "Organization Name is required.";

        if (request.SchoolCategoryID is null or <= 0)
            return "School Category is required.";

        if (request.BusinessCategoryID == 2 && (request.UnderOrgID is null or <= 0))
            return "Under Sanstha is required.";

        if (!string.IsNullOrWhiteSpace(request.EmailID) && !EmailRegex.IsMatch(request.EmailID.Trim()))
            return "Enter a valid email address.";

        if (!string.IsNullOrWhiteSpace(request.MobileNo) && !MobileRegex.IsMatch(request.MobileNo.Trim()))
            return "Mobile number must be 10 digits.";

        if (!string.IsNullOrWhiteSpace(request.PhoneNo) && !PhoneRegex.IsMatch(request.PhoneNo.Trim()))
            return "Phone number must be numeric.";

        if (!string.IsNullOrWhiteSpace(request.PanNo) && !PanRegex.IsMatch(request.PanNo.Trim().ToUpperInvariant()))
            return "Enter a valid PAN number.";

        if (!string.IsNullOrWhiteSpace(request.EstablishmentYear) && !YearRegex.IsMatch(request.EstablishmentYear.Trim()))
            return "Establishment year must be 4 digits.";

        if (!string.IsNullOrWhiteSpace(request.WebSite) && !Uri.TryCreate(request.WebSite.Trim(), UriKind.Absolute, out _))
            return "Enter a valid website URL.";

        return null;
    }

    private static SaveOrganizationRequestDto NormalizeRequest(SaveOrganizationRequestDto request)
    {
        var isSanstha = request.BusinessCategoryID == 3;
        return new SaveOrganizationRequestDto
        {
            OrgID = request.OrgID,
            BusinessCategoryID = request.BusinessCategoryID,
            UnderOrgID = isSanstha ? request.OrgID : request.UnderOrgID,
            SchoolCategoryID = request.SchoolCategoryID,
            SrNo = request.SrNo,
            OrganizationName = request.OrganizationName.Trim(),
            Address = TrimOrNull(request.Address),
            CityName = TrimOrNull(request.CityName),
            UDiesNo = TrimOrNull(request.UDiesNo),
            SchoolTinNo = TrimOrNull(request.SchoolTinNo),
            SharlarthID = TrimOrNull(request.SharlarthID),
            PanNo = TrimOrNull(request.PanNo)?.ToUpperInvariant(),
            EmailID = TrimOrNull(request.EmailID),
            PhoneNo = TrimOrNull(request.PhoneNo),
            MobileNo = TrimOrNull(request.MobileNo),
            WebSite = TrimOrNull(request.WebSite),
            EstablishmentYear = TrimOrNull(request.EstablishmentYear),
            RegNo = TrimOrNull(request.RegNo),
            Permission80G = TrimOrNull(request.Permission80G),
            Remark = TrimOrNull(request.Remark),
            IsActive = request.IsActive,
            Documents = request.Documents
                .Where(d => d.DocumentID > 0 && !string.IsNullOrWhiteSpace(d.DocumentPath))
                .ToList()
        };
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
