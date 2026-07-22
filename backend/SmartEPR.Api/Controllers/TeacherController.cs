using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Teacher;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/teacher")]
public sealed class TeacherController : ControllerBase
{
    private static readonly HashSet<string> PhotoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png"
    };

    private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png"
    };

    private const long MaxPhotoBytes = 2 * 1024 * 1024;
    private const long MaxDocumentBytes = 5 * 1024 * 1024;

    private const string PhotoFeature = "TeacherPhotos";
    private const string DocumentFeature = "TeacherDocuments";

    private readonly ITeacherService _teacherService;
    private readonly ILocalFileStorage _fileStorage;

    public TeacherController(ITeacherService teacherService, ILocalFileStorage fileStorage)
    {
        _teacherService = teacherService;
        _fileStorage = fileStorage;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups([FromQuery] long? underOrgId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TeacherLookupsBundleDto>.Fail("Invalid token."));

        try
        {
            var lookups = await _teacherService.GetLookupsAsync(userId, underOrgId, cancellationToken).ConfigureAwait(false);
            return Ok(ApiResponse<TeacherLookupsBundleDto>.Ok(lookups));
        }
        catch (SqlException ex)
        {
            return Ok(ApiResponse<TeacherLookupsBundleDto>.Fail(ex.Message));
        }
    }

    [HttpGet("next-srno")]
    public async Task<IActionResult> GetNextSrNo([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var next = await _teacherService.GetNextSrNoAsync(orgId, cancellationToken).ConfigureAwait(false);
        return next is null
            ? Ok(ApiResponse<NextTeacherSrNoDto>.Fail("Unable to get next SrNo."))
            : Ok(ApiResponse<NextTeacherSrNoDto>.Ok(new NextTeacherSrNoDto { NextSrNo = next.Value }));
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] TeacherListFilterDto filter, CancellationToken cancellationToken)
    {
        if (!filter.SansthaID.HasValue && TryGetSansthaId(out var sansthaId))
            filter = WithSansthaId(filter, sansthaId);

        var items = await _teacherService.GetListAsync(filter, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<TeacherListItemDto>>.Ok(items));
    }

    [HttpGet("{teacherId:long}")]
    public async Task<IActionResult> GetById(long teacherId, CancellationToken cancellationToken)
    {
        var item = await _teacherService.GetByIdAsync(teacherId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<TeacherDto>.Fail("Teacher not found."))
            : Ok(ApiResponse<TeacherDto>.Ok(item));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveTeacherRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(ApiResponse<TeacherDto>.Fail("Invalid token."));

        if (!request.SansthaID.HasValue && TryGetSansthaId(out var sansthaId))
            request.SansthaID = sansthaId;

        var (saved, error) = await _teacherService.SaveAsync(actorUserId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<TeacherDto>.Fail(error ?? "Unable to save teacher."))
            : Ok(ApiResponse<TeacherDto>.Ok(saved, "Teacher saved."));
    }

    [HttpPost("{teacherId:long}/documents")]
    public async Task<IActionResult> SaveDocuments(long teacherId, [FromBody] IReadOnlyList<SaveTeacherDocumentDto> documents, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(ApiResponse<TeacherDto>.Fail("Invalid token."));

        var (data, error) = await _teacherService.SaveDocumentsAsync(actorUserId, teacherId, documents ?? Array.Empty<SaveTeacherDocumentDto>(), cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<TeacherDto>.Fail(error ?? "Unable to save documents."))
            : Ok(ApiResponse<TeacherDto>.Ok(data, "Documents saved."));
    }

    [HttpDelete("{teacherId:long}")]
    public async Task<IActionResult> Delete(long teacherId, CancellationToken cancellationToken)
    {
        var (success, error) = await _teacherService.DeleteAsync(teacherId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<object>.Ok(null!, "Teacher deactivated."))
            : Ok(ApiResponse<object>.Fail(error ?? "Unable to delete teacher."));
    }

    [HttpPost("{teacherId:long}/reset-password")]
    public async Task<IActionResult> ResetPassword(long teacherId, [FromBody] ResetTeacherPasswordRequestDto request, CancellationToken cancellationToken)
    {
        var (success, error) = await _teacherService.ResetPasswordAsync(teacherId, request.AppPassword, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<object>.Ok(null!, "Password reset."))
            : Ok(ApiResponse<object>.Fail(error ?? "Unable to reset password."));
    }

    [HttpPost("upload-photo")]
    [RequestSizeLimit(MaxPhotoBytes)]
    public async Task<IActionResult> UploadPhoto(IFormFile file, [FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("No file uploaded."));

        if (orgId <= 0)
            return Ok(ApiResponse<string>.Fail("Organization is required for photo upload."));

        if (file.Length > MaxPhotoBytes)
            return Ok(ApiResponse<string>.Fail("Photo must be 2 MB or smaller."));

        var ext = Path.GetExtension(file.FileName);
        if (!PhotoExtensions.Contains(ext))
            return Ok(ApiResponse<string>.Fail("Only JPG, JPEG, and PNG photos are allowed."));

        try
        {
            await using var stream = file.OpenReadStream();
            var relativePath = await _fileStorage
                .SaveAsync(PhotoFeature, orgId, stream, file.FileName, cancellationToken)
                .ConfigureAwait(false);

            return Ok(ApiResponse<string>.Ok(relativePath, "Photo uploaded."));
        }
        catch (IOException)
        {
            return Ok(ApiResponse<string>.Fail("Unable to save photo on server. Contact administrator."));
        }
        catch (UnauthorizedAccessException)
        {
            return Ok(ApiResponse<string>.Fail("Server cannot write upload folder. Contact administrator."));
        }
    }

    [HttpGet("photo/{*relativePath}")]
    public IActionResult GetPhoto(string relativePath)
    {
        var fullPath = _fileStorage.ResolvePhysicalPath(PhotoFeature, relativePath);
        if (fullPath is null)
            return NotFound();

        var contentType = Path.GetExtension(fullPath).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
        return PhysicalFile(fullPath, contentType);
    }

    [HttpPost("upload-document")]
    [RequestSizeLimit(MaxDocumentBytes)]
    public async Task<IActionResult> UploadDocument(IFormFile file, [FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("No file uploaded."));

        if (orgId <= 0)
            return Ok(ApiResponse<string>.Fail("Organization is required for document upload."));

        if (file.Length > MaxDocumentBytes)
            return Ok(ApiResponse<string>.Fail("Document must be 5 MB or smaller."));

        var ext = Path.GetExtension(file.FileName);
        if (!DocumentExtensions.Contains(ext))
            return Ok(ApiResponse<string>.Fail("Only PDF, JPG, JPEG, and PNG files are allowed."));

        try
        {
            await using var stream = file.OpenReadStream();
            var relativePath = await _fileStorage
                .SaveAsync(DocumentFeature, orgId, stream, file.FileName, cancellationToken)
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

    [HttpGet("document/{*relativePath}")]
    public IActionResult GetDocument(string relativePath)
    {
        var fullPath = _fileStorage.ResolvePhysicalPath(DocumentFeature, relativePath);
        if (fullPath is null)
            return NotFound();

        var downloadName = Path.GetFileName(fullPath);
        var contentType = Path.GetExtension(fullPath).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
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

    private bool TryGetSansthaId(out long sansthaId)
    {
        sansthaId = 0;
        var claim = User.FindFirstValue("sanstha_id");
        return long.TryParse(claim, out sansthaId) && sansthaId > 0;
    }

    private static TeacherListFilterDto WithSansthaId(TeacherListFilterDto filter, long sansthaId) => new()
    {
        OrgID = filter.OrgID,
        SansthaID = sansthaId,
        Search = filter.Search,
        ShalarthID = filter.ShalarthID,
        MobileNo = filter.MobileNo,
        DesignationCode = filter.DesignationCode,
        Subject = filter.Subject,
        UserRoleID = filter.UserRoleID,
        IsActive = filter.IsActive
    };
}
