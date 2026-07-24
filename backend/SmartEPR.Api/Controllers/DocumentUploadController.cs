using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.DocumentUpload;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/document-upload")]
public sealed class DocumentUploadController : ControllerBase
{
    private static readonly HashSet<int> AdminOwnerRoleIds = [1, 2];

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"
    };

    private const long MaxUploadBytes = 5 * 1024 * 1024;
    private const string DocumentFeature = "Documents";

    private readonly IDocumentUploadService _documentUploadService;
    private readonly IUserRepository _userRepository;
    private readonly ILocalFileStorage _fileStorage;

    public DocumentUploadController(
        IDocumentUploadService documentUploadService,
        IUserRepository userRepository,
        ILocalFileStorage fileStorage)
    {
        _documentUploadService = documentUploadService;
        _userRepository = userRepository;
        _fileStorage = fileStorage;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (!await IsAdminOrOwnerAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<IReadOnlyList<DocumentUploadDto>>.Fail("Only Admin or Owner users can access document upload master."));

        if (orgId <= 0)
            return Ok(ApiResponse<IReadOnlyList<DocumentUploadDto>>.Fail("Organization is required."));

        var items = await _documentUploadService.GetListAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<DocumentUploadDto>>.Ok(items));
    }

    [HttpGet("{documentUploadId:long}")]
    public async Task<IActionResult> GetById(long documentUploadId, CancellationToken cancellationToken)
    {
        if (!await IsAdminOrOwnerAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<DocumentUploadDto>.Fail("Only Admin or Owner users can access document upload master."));

        var item = await _documentUploadService.GetByIdAsync(documentUploadId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<DocumentUploadDto>.Fail("Document not found."))
            : Ok(ApiResponse<DocumentUploadDto>.Ok(item));
    }

    [HttpGet("next-srno")]
    public async Task<IActionResult> GetNextSrNo([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (!await IsAdminOrOwnerAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<NextSrNoDto>.Fail("Only Admin or Owner users can access document upload master."));

        if (orgId <= 0)
            return Ok(ApiResponse<NextSrNoDto>.Fail("Organization is required."));

        var next = await _documentUploadService.GetNextSrNoAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<NextSrNoDto>.Ok(new NextSrNoDto { NextSrNo = (int)next }));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveDocumentUploadRequestDto request, CancellationToken cancellationToken)
    {
        if (!await IsAdminOrOwnerAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<DocumentUploadDto>.Fail("Only Admin or Owner users can access document upload master."));

        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<DocumentUploadDto>.Fail("Invalid token."));

        var (data, error) = await _documentUploadService.SaveAsync(request, userId, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<DocumentUploadDto>.Fail(error ?? "Unable to save document."))
            : Ok(ApiResponse<DocumentUploadDto>.Ok(data, "Document saved."));
    }

    [HttpDelete("{documentUploadId:long}")]
    public async Task<IActionResult> Delete(long documentUploadId, CancellationToken cancellationToken)
    {
        if (!await IsAdminOrOwnerAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<bool>.Fail("Only Admin or Owner users can access document upload master."));

        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid token."));

        var (success, error) = await _documentUploadService.DeleteAsync(documentUploadId, userId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Document deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete document."));
    }

    [HttpPost("upload")]
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<IActionResult> Upload(IFormFile file, [FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (!await IsAdminOrOwnerAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<string>.Fail("Only Admin or Owner users can upload documents."));

        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("File is required."));

        if (orgId <= 0)
            return Ok(ApiResponse<string>.Fail("Organization is required for file upload."));

        if (file.Length > MaxUploadBytes)
            return Ok(ApiResponse<string>.Fail("Maximum file size is 5 MB."));

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
            return Ok(ApiResponse<string>.Fail("Allowed file types: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG."));

        await using var stream = file.OpenReadStream();
        var relativePath = await _fileStorage
            .SaveAsync(DocumentFeature, orgId, stream, file.FileName, cancellationToken)
            .ConfigureAwait(false);

        return Ok(ApiResponse<string>.Ok(relativePath, "Document uploaded."));
    }

    [HttpGet("file/{*relativePath}")]
    public async Task<IActionResult> DownloadFile(string relativePath, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var isAdmin = await IsAdminOrOwnerAsync(cancellationToken).ConfigureAwait(false);
        if (!isAdmin && !await _documentUploadService.CanUserAccessFileAsync(userId, relativePath, cancellationToken).ConfigureAwait(false))
            return Unauthorized();

        var fullPath = _fileStorage.ResolvePhysicalPath(DocumentFeature, relativePath);
        if (fullPath is null)
            return NotFound();

        var downloadName = Path.GetFileName(fullPath);
        var contentType = GetContentType(Path.GetExtension(fullPath));
        return PhysicalFile(fullPath, contentType, downloadName, enableRangeProcessing: true);
    }

    private static string GetContentType(string ext) => ext.ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls" => "application/vnd.ms-excel",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        _ => "application/octet-stream"
    };

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }

    private async Task<bool> IsAdminOrOwnerAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return false;

        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        return profile?.UserRoleID is int roleId && AdminOwnerRoleIds.Contains(roleId);
    }
}
