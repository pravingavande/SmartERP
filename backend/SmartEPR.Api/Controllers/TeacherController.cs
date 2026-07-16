using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    private readonly ITeacherService _teacherService;
    private readonly IWebHostEnvironment _environment;

    public TeacherController(ITeacherService teacherService, IWebHostEnvironment environment)
    {
        _teacherService = teacherService;
        _environment = environment;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TeacherLookupsBundleDto>.Fail("Invalid token."));

        var lookups = await _teacherService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<TeacherLookupsBundleDto>.Ok(lookups));
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
        if (!TryGetUserId(out _))
            return Unauthorized(ApiResponse<TeacherDto>.Fail("Invalid token."));

        var (saved, error) = await _teacherService.SaveAsync(request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<TeacherDto>.Fail(error ?? "Unable to save teacher."))
            : Ok(ApiResponse<TeacherDto>.Ok(saved, "Teacher saved."));
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
    public async Task<IActionResult> UploadPhoto(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("No file uploaded."));

        if (file.Length > MaxPhotoBytes)
            return Ok(ApiResponse<string>.Fail("Photo must be 2 MB or smaller."));

        var ext = Path.GetExtension(file.FileName);
        if (!PhotoExtensions.Contains(ext))
            return Ok(ApiResponse<string>.Fail("Only JPG, JPEG, and PNG photos are allowed."));

        var storedName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "TeacherPhotos");
        Directory.CreateDirectory(uploadDir);
        var fullPath = Path.Combine(uploadDir, storedName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken).ConfigureAwait(false);
        }

        return Ok(ApiResponse<string>.Ok(storedName, "Photo uploaded."));
    }

    [HttpGet("photo/{fileName}")]
    public IActionResult GetPhoto(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains(".."))
            return NotFound();

        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "TeacherPhotos");
        var fullPath = Path.Combine(uploadDir, fileName);
        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        var contentType = Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
        return PhysicalFile(fullPath, contentType);
    }

    [HttpPost("upload-document")]
    [RequestSizeLimit(MaxDocumentBytes)]
    public async Task<IActionResult> UploadDocument(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("No file uploaded."));

        if (file.Length > MaxDocumentBytes)
            return Ok(ApiResponse<string>.Fail("Document must be 5 MB or smaller."));

        var ext = Path.GetExtension(file.FileName);
        if (!DocumentExtensions.Contains(ext))
            return Ok(ApiResponse<string>.Fail("Only PDF, JPG, JPEG, and PNG files are allowed."));

        var storedName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "TeacherDocuments");
        Directory.CreateDirectory(uploadDir);
        var fullPath = Path.Combine(uploadDir, storedName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken).ConfigureAwait(false);
        }

        return Ok(ApiResponse<string>.Ok(storedName, "Document uploaded."));
    }

    [HttpGet("document/{fileName}")]
    public IActionResult GetDocument(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..", StringComparison.Ordinal))
            return NotFound();

        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "TeacherDocuments");
        var fullPath = Path.Combine(uploadDir, fileName);
        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        var contentType = Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
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
