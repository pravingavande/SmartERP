using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class MasterController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"
    };

    private readonly IMasterService _masterService;
    private readonly IWebHostEnvironment _environment;

    public MasterController(IMasterService masterService, IWebHostEnvironment environment)
    {
        _masterService = masterService;
        _environment = environment;
    }

    [HttpGet("class")]
    public async Task<IActionResult> GetClassList([FromQuery] string? search, CancellationToken cancellationToken)
    {
        var items = await _masterService.GetClassListAsync(search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<ClassMasterDto>>.Ok(items));
    }

    [HttpPost("class")]
    public async Task<IActionResult> SaveClass([FromBody] SaveClassRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _masterService.SaveClassAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<ClassMasterDto>.Fail(error ?? "Unable to save class."))
            : Ok(ApiResponse<ClassMasterDto>.Ok(data, "Class saved."));
    }

    [HttpDelete("class/{classId:long}")]
    public async Task<IActionResult> DeleteClass(long classId, CancellationToken cancellationToken)
    {
        var (success, error) = await _masterService.DeleteClassAsync(classId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Class deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete class."));
    }

    [HttpGet("subject")]
    public async Task<IActionResult> GetSubjectList([FromQuery] string? search, CancellationToken cancellationToken)
    {
        var items = await _masterService.GetSubjectListAsync(search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<SubjectMasterDto>>.Ok(items));
    }

    [HttpPost("subject")]
    public async Task<IActionResult> SaveSubject([FromBody] SaveSubjectRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _masterService.SaveSubjectAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<SubjectMasterDto>.Fail(error ?? "Unable to save subject."))
            : Ok(ApiResponse<SubjectMasterDto>.Ok(data, "Subject saved."));
    }

    [HttpDelete("subject/{subjectId:long}")]
    public async Task<IActionResult> DeleteSubject(long subjectId, CancellationToken cancellationToken)
    {
        var (success, error) = await _masterService.DeleteSubjectAsync(subjectId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Subject deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete subject."));
    }

    [HttpGet("academic-schedule/lookups")]
    public async Task<IActionResult> GetAcademicScheduleLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AcademicScheduleLookupsDto>.Fail("Invalid token."));

        var lookups = await _masterService.GetAcademicScheduleLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<AcademicScheduleLookupsDto>.Ok(lookups));
    }

    [HttpGet("academic-schedule/current-ay")]
    public async Task<IActionResult> GetCurrentAy(CancellationToken cancellationToken)
    {
        var ayId = await _masterService.GetCurrentAyIdAsync(cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<CurrentAyDto>.Ok(new CurrentAyDto { AyID = ayId }));
    }

    [HttpGet("academic-schedule")]
    public async Task<IActionResult> GetAcademicScheduleList(
        [FromQuery] long? underOrgId,
        [FromQuery] long? classId,
        [FromQuery] long? subjectId,
        [FromQuery] int? tMonth,
        [FromQuery] long? weekId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] long? ayId,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var filter = new AcademicScheduleListFilterDto
        {
            UnderOrgID = underOrgId,
            ClassID = classId,
            SubjectID = subjectId,
            TMonth = tMonth,
            WeekID = weekId,
            FromDate = fromDate,
            ToDate = toDate,
            AyID = ayId,
            Search = search
        };
        var items = await _masterService.GetAcademicScheduleListAsync(filter, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AcademicScheduleDto>>.Ok(items));
    }

    [HttpGet("academic-schedule/{asid:long}")]
    public async Task<IActionResult> GetAcademicScheduleById(long asid, CancellationToken cancellationToken)
    {
        var item = await _masterService.GetAcademicScheduleByIdAsync(asid, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<AcademicScheduleDto>.Fail("Academic schedule not found."))
            : Ok(ApiResponse<AcademicScheduleDto>.Ok(item));
    }

    [HttpPost("academic-schedule")]
    public async Task<IActionResult> SaveAcademicSchedule([FromBody] SaveAcademicScheduleRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _masterService.SaveAcademicScheduleAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AcademicScheduleDto>.Fail(error ?? "Unable to save academic schedule."))
            : Ok(ApiResponse<AcademicScheduleDto>.Ok(data, "Academic schedule saved."));
    }

    [HttpDelete("academic-schedule/{asid:long}")]
    public async Task<IActionResult> DeleteAcademicSchedule(long asid, CancellationToken cancellationToken)
    {
        var (success, error) = await _masterService.DeleteAcademicScheduleAsync(asid, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Academic schedule deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete academic schedule."));
    }

    [HttpPost("academic-schedule/upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadAcademicScheduleFile(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("File is required."));

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
            return Ok(ApiResponse<string>.Fail("Allowed file types: PDF, DOC, DOCX, JPG, JPEG, PNG."));

        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "AcademicSchedule");
        Directory.CreateDirectory(uploadDir);

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(uploadDir, storedName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken).ConfigureAwait(false);
        }

        return Ok(ApiResponse<string>.Ok(storedName, "File uploaded."));
    }

    [HttpGet("academic-schedule/file/{fileName}")]
    public IActionResult DownloadAcademicScheduleFile(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..") || fileName.Contains('/') || fileName.Contains('\\'))
            return BadRequest();

        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "AcademicSchedule");
        var fullPath = Path.Combine(uploadDir, fileName);
        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        var contentType = GetContentType(Path.GetExtension(fileName));
        return PhysicalFile(fullPath, contentType, fileName, enableRangeProcessing: true);
    }

    [HttpGet("inventory/lookups")]
    public async Task<IActionResult> GetInventoryLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<InventoryLookupsDto>.Fail("Invalid token."));

        var lookups = await _masterService.GetInventoryLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<InventoryLookupsDto>.Ok(lookups));
    }

    [HttpGet("item-group")]
    public async Task<IActionResult> GetItemGroupList([FromQuery] long orgId, [FromQuery] string? search, CancellationToken cancellationToken)
    {
        var items = await _masterService.GetItemGroupListAsync(orgId, search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<ItemGroupMasterDto>>.Ok(items));
    }

    [HttpPost("item-group")]
    public async Task<IActionResult> SaveItemGroup([FromBody] SaveItemGroupRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _masterService.SaveItemGroupAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<ItemGroupMasterDto>.Fail(error ?? "Unable to save item group."))
            : Ok(ApiResponse<ItemGroupMasterDto>.Ok(data, "Item group saved."));
    }

    [HttpDelete("item-group/{itemGroupId:long}")]
    public async Task<IActionResult> DeleteItemGroup(long itemGroupId, CancellationToken cancellationToken)
    {
        var (success, error) = await _masterService.DeleteItemGroupAsync(itemGroupId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Item group deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete item group."));
    }

    [HttpGet("item")]
    public async Task<IActionResult> GetItemList([FromQuery] long orgId, [FromQuery] string? search, CancellationToken cancellationToken)
    {
        var items = await _masterService.GetItemListAsync(orgId, search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<ItemMasterDto>>.Ok(items));
    }

    [HttpPost("item")]
    public async Task<IActionResult> SaveItem([FromBody] SaveItemRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _masterService.SaveItemAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<ItemMasterDto>.Fail(error ?? "Unable to save item."))
            : Ok(ApiResponse<ItemMasterDto>.Ok(data, "Item saved."));
    }

    [HttpDelete("item/{itemId:long}")]
    public async Task<IActionResult> DeleteItem(long itemId, CancellationToken cancellationToken)
    {
        var (success, error) = await _masterService.DeleteItemAsync(itemId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Item deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete item."));
    }

    [HttpGet("stock")]
    public async Task<IActionResult> GetStockList([FromQuery] long orgId, [FromQuery] string? search, CancellationToken cancellationToken)
    {
        var items = await _masterService.GetStockListAsync(orgId, search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<StockRegisterDto>>.Ok(items));
    }

    [HttpPost("stock")]
    public async Task<IActionResult> SaveStock([FromBody] SaveStockRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _masterService.SaveStockAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<StockRegisterDto>.Fail(error ?? "Unable to save stock entry."))
            : Ok(ApiResponse<StockRegisterDto>.Ok(data, "Stock entry saved."));
    }

    [HttpDelete("stock/{stockId:long}")]
    public async Task<IActionResult> DeleteStock(long stockId, CancellationToken cancellationToken)
    {
        var (success, error) = await _masterService.DeleteStockAsync(stockId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Stock entry deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete stock entry."));
    }

    private static string GetContentType(string ext) => ext.ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
}
