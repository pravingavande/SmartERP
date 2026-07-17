using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.IoRegister;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/io")]
public sealed class IoRegisterController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".xls", ".xlsx"
    };

    private readonly IIoRegisterService _ioRegisterService;
    private readonly ILocalFileStorage _fileStorage;

    public IoRegisterController(IIoRegisterService ioRegisterService, ILocalFileStorage fileStorage)
    {
        _ioRegisterService = ioRegisterService;
        _fileStorage = fileStorage;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IoLookupsDto>.Fail("Invalid token."));

        var lookups = await _ioRegisterService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IoLookupsDto>.Ok(lookups));
    }

    [HttpGet("inward/next-record-no")]
    public async Task<IActionResult> GetInwardNextRecordNo([FromQuery] long orgId, [FromQuery] long? yioId, CancellationToken cancellationToken)
    {
        var row = await _ioRegisterService.GetInwardNextRecordNoAsync(orgId, yioId, cancellationToken).ConfigureAwait(false);
        return row is null
            ? Ok(ApiResponse<NextRecordNoDto>.Fail("Unable to get next record number."))
            : Ok(ApiResponse<NextRecordNoDto>.Ok(row));
    }

    [HttpGet("inward")]
    public async Task<IActionResult> GetInwardList([FromQuery] InwardListFilterDto filter, CancellationToken cancellationToken)
    {
        var items = await _ioRegisterService.GetInwardListAsync(filter, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<InwardRegisterDto>>.Ok(items));
    }

    [HttpGet("inward/{irid:long}")]
    public async Task<IActionResult> GetInwardById(long irid, CancellationToken cancellationToken)
    {
        var item = await _ioRegisterService.GetInwardByIdAsync(irid, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<InwardRegisterDto>.Fail("Inward entry not found."))
            : Ok(ApiResponse<InwardRegisterDto>.Ok(item));
    }

    [HttpPost("inward")]
    public async Task<IActionResult> SaveInward([FromBody] SaveInwardRequestDto request, CancellationToken cancellationToken)
    {
        TryGetUserId(out var userId);
        var (data, error) = await _ioRegisterService.SaveInwardAsync(request, userId > 0 ? userId : null, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<InwardRegisterDto>.Fail(error ?? "Unable to save inward entry."))
            : Ok(ApiResponse<InwardRegisterDto>.Ok(data, "Inward entry saved."));
    }

    [HttpDelete("inward/{irid:long}")]
    public async Task<IActionResult> DeleteInward(long irid, CancellationToken cancellationToken)
    {
        var (success, error) = await _ioRegisterService.DeleteInwardAsync(irid, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Inward entry deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete inward entry."));
    }

    [HttpGet("inward/export")]
    public async Task<IActionResult> ExportInward([FromQuery] InwardListFilterDto filter, [FromQuery] string format = "csv", CancellationToken cancellationToken = default)
    {
        var items = await _ioRegisterService.GetInwardListAsync(filter, cancellationToken).ConfigureAwait(false);
        if (string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase))
        {
            var html = BuildInwardReportHtml(items);
            return File(Encoding.UTF8.GetBytes(html), "text/html", "inward-register-report.html");
        }

        var csv = _ioRegisterService.BuildInwardReportCsv(items);
        return File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray(), "text/csv", "inward-register-report.csv");
    }

    [HttpPost("inward/upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadInwardFile(IFormFile file, [FromQuery] long orgId, CancellationToken cancellationToken)
        => await UploadFileAsync(file, "InwardRegister", orgId, cancellationToken).ConfigureAwait(false);

    [HttpGet("inward/file/{*relativePath}")]
    public IActionResult DownloadInwardFile(string relativePath)
        => DownloadFile("InwardRegister", relativePath);

    [HttpGet("outward/next-record-no")]
    public async Task<IActionResult> GetOutwardNextRecordNo([FromQuery] long orgId, [FromQuery] long? yioId, CancellationToken cancellationToken)
    {
        var row = await _ioRegisterService.GetOutwardNextRecordNoAsync(orgId, yioId, cancellationToken).ConfigureAwait(false);
        return row is null
            ? Ok(ApiResponse<NextRecordNoDto>.Fail("Unable to get next record number."))
            : Ok(ApiResponse<NextRecordNoDto>.Ok(row));
    }

    [HttpGet("outward")]
    public async Task<IActionResult> GetOutwardList([FromQuery] OutwardListFilterDto filter, CancellationToken cancellationToken)
    {
        var items = await _ioRegisterService.GetOutwardListAsync(filter, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<OutwardRegisterDto>>.Ok(items));
    }

    [HttpGet("outward/{orid:long}")]
    public async Task<IActionResult> GetOutwardById(long orid, CancellationToken cancellationToken)
    {
        var item = await _ioRegisterService.GetOutwardByIdAsync(orid, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<OutwardRegisterDto>.Fail("Outward entry not found."))
            : Ok(ApiResponse<OutwardRegisterDto>.Ok(item));
    }

    [HttpPost("outward")]
    public async Task<IActionResult> SaveOutward([FromBody] SaveOutwardRequestDto request, CancellationToken cancellationToken)
    {
        TryGetUserId(out var userId);
        var (data, error) = await _ioRegisterService.SaveOutwardAsync(request, userId > 0 ? userId : null, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<OutwardRegisterDto>.Fail(error ?? "Unable to save outward entry."))
            : Ok(ApiResponse<OutwardRegisterDto>.Ok(data, "Outward entry saved."));
    }

    [HttpDelete("outward/{orid:long}")]
    public async Task<IActionResult> DeleteOutward(long orid, CancellationToken cancellationToken)
    {
        var (success, error) = await _ioRegisterService.DeleteOutwardAsync(orid, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Outward entry deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete outward entry."));
    }

    [HttpGet("outward/export")]
    public async Task<IActionResult> ExportOutward([FromQuery] OutwardListFilterDto filter, [FromQuery] string format = "csv", CancellationToken cancellationToken = default)
    {
        var items = await _ioRegisterService.GetOutwardListAsync(filter, cancellationToken).ConfigureAwait(false);
        if (string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase))
        {
            var html = BuildOutwardReportHtml(items);
            return File(Encoding.UTF8.GetBytes(html), "text/html", "outward-register-report.html");
        }

        var csv = _ioRegisterService.BuildOutwardReportCsv(items);
        return File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray(), "text/csv", "outward-register-report.csv");
    }

    [HttpPost("outward/upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadOutwardFile(IFormFile file, [FromQuery] long orgId, CancellationToken cancellationToken)
        => await UploadFileAsync(file, "OutwardRegister", orgId, cancellationToken).ConfigureAwait(false);

    [HttpGet("outward/file/{*relativePath}")]
    public IActionResult DownloadOutwardFile(string relativePath)
        => DownloadFile("OutwardRegister", relativePath);

    private async Task<IActionResult> UploadFileAsync(IFormFile file, string folder, long orgId, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("File is required."));

        if (orgId <= 0)
            return Ok(ApiResponse<string>.Fail("Organization is required for file upload."));

        if (file.Length > 10 * 1024 * 1024)
            return Ok(ApiResponse<string>.Fail("Maximum file size is 10 MB."));

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
            return Ok(ApiResponse<string>.Fail("Allowed file types: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX."));

        await using var stream = file.OpenReadStream();
        var relativePath = await _fileStorage
            .SaveAsync(folder, orgId, stream, file.FileName, cancellationToken)
            .ConfigureAwait(false);

        return Ok(ApiResponse<string>.Ok(relativePath, "File uploaded."));
    }

    private IActionResult DownloadFile(string folder, string relativePath)
    {
        var fullPath = _fileStorage.ResolvePhysicalPath(folder, relativePath);
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

    private static string BuildInwardReportHtml(IReadOnlyList<InwardRegisterDto> rows)
    {
        var sb = new StringBuilder();
        sb.Append("<html><head><title>Inward Register Report</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{background:#f5f5f5}</style></head><body>");
        sb.Append("<h2>Inward Register Report</h2><table><thead><tr>");
        sb.Append("<th>Record No</th><th>Date</th><th>File No</th><th>Letter No</th><th>From</th><th>Subject</th><th>To Whom</th><th>Remarks</th><th>Year</th>");
        sb.Append("</tr></thead><tbody>");
        foreach (var row in rows)
        {
            sb.Append("<tr>");
            sb.Append($"<td>{row.RecordNo}</td><td>{row.IRDate:dd/MM/yyyy}</td><td>{Encode(row.FileNo)}</td><td>{Encode(row.LetterNo)}</td>");
            sb.Append($"<td>{Encode(row.FromWhomReceived)}</td><td>{Encode(row.Subject)}</td><td>{Encode(row.ToWhomIssued)}</td><td>{Encode(row.Remark)}</td><td>{Encode(row.YearName)}</td>");
            sb.Append("</tr>");
        }
        sb.Append("</tbody></table></body></html>");
        return sb.ToString();
    }

    private static string BuildOutwardReportHtml(IReadOnlyList<OutwardRegisterDto> rows)
    {
        var sb = new StringBuilder();
        sb.Append("<html><head><title>Outward Register Report</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{background:#f5f5f5}</style></head><body>");
        sb.Append("<h2>Outward Register Report</h2><table><thead><tr>");
        sb.Append("<th>Record No</th><th>Date</th><th>File No</th><th>Subject</th><th>Address</th><th>Enclosures</th><th>Expenses</th><th>Remarks</th><th>Year</th>");
        sb.Append("</tr></thead><tbody>");
        foreach (var row in rows)
        {
            sb.Append("<tr>");
            sb.Append($"<td>{row.RecordNo}</td><td>{row.ORDate:dd/MM/yyyy}</td><td>{Encode(row.FileNo)}</td><td>{Encode(row.Subject)}</td>");
            sb.Append($"<td>{Encode(row.Address)}</td><td>{Encode(row.Enclosures)}</td><td>{row.ExpensesAmt:0.00}</td><td>{Encode(row.Remark)}</td><td>{Encode(row.YearName)}</td>");
            sb.Append("</tr>");
        }
        sb.Append("</tbody></table></body></html>");
        return sb.ToString();
    }

    private static string Encode(string? value) => System.Net.WebUtility.HtmlEncode(value ?? string.Empty);

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
