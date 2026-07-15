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

    private readonly IOrganizationService _organizationService;
    private readonly IWebHostEnvironment _environment;

    public OrganizationController(IOrganizationService organizationService, IWebHostEnvironment environment)
    {
        _organizationService = organizationService;
        _environment = environment;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        var lookups = await _organizationService.GetLookupsAsync(cancellationToken).ConfigureAwait(false);
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

        if (file.Length > MaxUploadBytes)
            return Ok(ApiResponse<string>.Fail("Maximum file size is 5 MB."));

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
            return Ok(ApiResponse<string>.Fail("Only PDF, JPG, JPEG, and PNG files are allowed."));

        var storedName = $"ORG-{orgId ?? 0}-{documentId ?? 0}-{Guid.NewGuid():N}{extension}";
        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "OrganizationDocuments");
        Directory.CreateDirectory(uploadDir);
        var fullPath = Path.Combine(uploadDir, storedName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken).ConfigureAwait(false);
        }

        return Ok(ApiResponse<string>.Ok(storedName, "Document uploaded."));
    }

    [HttpGet("file/{fileName}")]
    public IActionResult DownloadFile(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..", StringComparison.Ordinal))
            return BadRequest();

        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "OrganizationDocuments");
        var fullPath = Path.Combine(uploadDir, fileName);
        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        var contentType = Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => "application/octet-stream"
        };

        return PhysicalFile(fullPath, contentType, fileName, enableRangeProcessing: true);
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
