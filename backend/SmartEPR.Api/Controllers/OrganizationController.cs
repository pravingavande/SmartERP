using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Organization;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/organization")]
public sealed class OrganizationController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png"
    };

    private const long MaxUploadBytes = 5 * 1024 * 1024;

    private const string DocumentFeature = "OrganizationDocuments";

    private readonly IOrganizationService _organizationService;
    private readonly ILocalFileStorage _fileStorage;

    public OrganizationController(IOrganizationService organizationService, ILocalFileStorage fileStorage)
    {
        _organizationService = organizationService;
        _fileStorage = fileStorage;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<OrganizationLookupsDto>.Fail("Invalid token."));

        var lookups = await _organizationService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<OrganizationLookupsDto>.Ok(lookups));
    }

    [HttpGet("documents")]
    public async Task<IActionResult> GetDocumentsByBusinessCategory([FromQuery] int businessCategoryId, CancellationToken cancellationToken)
    {
        var items = await _organizationService.GetDocumentsByBusinessCategoryAsync(businessCategoryId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<OrganizationDocumentOptionDto>>.Ok(items));
    }

    [HttpGet("next-srno")]
    public async Task<IActionResult> GetNextSrNo([FromQuery] long underOrgId, CancellationToken cancellationToken)
    {
        var next = await _organizationService.GetNextSrNoAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<NextSrNoDto>.Ok(new NextSrNoDto { NextSrNo = next ?? 1 }));
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] OrganizationListFilterDto filter, CancellationToken cancellationToken)
    {
        var items = await _organizationService.GetListAsync(filter, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<OrganizationListItemDto>>.Ok(items));
    }

    [HttpGet("{orgId:long}")]
    public async Task<IActionResult> GetById(long orgId, CancellationToken cancellationToken)
    {
        var item = await _organizationService.GetByIdAsync(orgId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<OrganizationDto>.Fail("Organization not found."))
            : Ok(ApiResponse<OrganizationDto>.Ok(item));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveOrganizationRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _organizationService.SaveAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<OrganizationDto>.Fail(error ?? "Unable to save organization."))
            : Ok(ApiResponse<OrganizationDto>.Ok(data, "Organization saved."));
    }

    [HttpDelete("{orgId:long}")]
    public async Task<IActionResult> Delete(long orgId, CancellationToken cancellationToken)
    {
        var (success, error) = await _organizationService.DeleteAsync(orgId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Organization deactivated."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to deactivate organization."));
    }

    [HttpPost("upload")]
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<IActionResult> UploadDocument(IFormFile file, [FromQuery] long? orgId, [FromQuery] long? documentId, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("No file uploaded."));

        if (orgId is null or <= 0)
            return Ok(ApiResponse<string>.Fail("Organization is required for document upload."));

        if (file.Length > MaxUploadBytes)
            return Ok(ApiResponse<string>.Fail("Maximum file size is 5 MB."));

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
            return Ok(ApiResponse<string>.Fail("Only PDF, JPG, JPEG, and PNG files are allowed."));

        // documentId kept for API compatibility; storage is OrgID-folder based.
        _ = documentId;

        try
        {
            await using var stream = file.OpenReadStream();
            var relativePath = await _fileStorage
                .SaveAsync(DocumentFeature, orgId.Value, stream, file.FileName, cancellationToken)
                .ConfigureAwait(false);

            return Ok(ApiResponse<string>.Ok(relativePath, "Document uploaded."));
        }
        catch (IOException)
        {
            return Ok(ApiResponse<string>.Fail("Unable to save document on server. Contact administrator."));
        }
        catch (UnauthorizedAccessException)
        {
            return Ok(ApiResponse<string>.Fail("Server cannot write upload folder. Contact administrator."));
        }
    }

    [HttpGet("file/{*relativePath}")]
    public IActionResult DownloadFile(string relativePath)
    {
        var fullPath = _fileStorage.ResolvePhysicalPath(DocumentFeature, relativePath);
        if (fullPath is null)
            return NotFound();

        var downloadName = Path.GetFileName(fullPath);
        var contentType = Path.GetExtension(fullPath).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => "application/octet-stream"
        };

        return PhysicalFile(fullPath, contentType, downloadName, enableRangeProcessing: true);
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
