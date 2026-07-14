using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Ticket;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class TicketController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly IWebHostEnvironment _environment;

    public TicketController(ITicketService ticketService, IWebHostEnvironment environment)
    {
        _ticketService = ticketService;
        _environment = environment;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketLookupsDto>.Fail("Invalid token."));

        var lookups = await _ticketService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<TicketLookupsDto>.Ok(lookups));
    }

    [HttpGet("pending-notifications")]
    public async Task<IActionResult> GetPendingNotifications(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<TicketPendingNotificationDto>>.Fail("Invalid token."));

        var items = await _ticketService.GetPendingNotificationsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<TicketPendingNotificationDto>>.Ok(items));
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] long? orgId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<TicketListItemDto>>.Fail("Invalid token."));

        var items = await _ticketService.GetListAsync(userId, orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<TicketListItemDto>>.Ok(items));
    }

    [HttpGet("{ticketId:long}")]
    public async Task<IActionResult> GetById(long ticketId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketDetailDto>.Fail("Invalid token."));

        var item = await _ticketService.GetDetailAsync(ticketId, userId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<TicketDetailDto>.Fail("Ticket not found."))
            : Ok(ApiResponse<TicketDetailDto>.Ok(item));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveTicketRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketDetailDto>.Fail("Invalid token."));

        if (request.OrgIDs is null || request.OrgIDs.Count == 0)
            return Ok(ApiResponse<TicketDetailDto>.Fail("At least one school is required."));

        if (string.IsNullOrWhiteSpace(request.Subject))
            return Ok(ApiResponse<TicketDetailDto>.Fail("Subject is required."));

        if (string.IsNullOrWhiteSpace(request.ReplyRequired))
            return Ok(ApiResponse<TicketDetailDto>.Fail("Reply Required is required."));

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var saved = await _ticketService.SaveAsync(userId, ip, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<TicketDetailDto>.Fail("Unable to save ticket. Check required fields and permissions."))
            : Ok(ApiResponse<TicketDetailDto>.Ok(saved, "Ticket saved."));
    }

    [HttpPost("reply")]
    public async Task<IActionResult> AddReply([FromBody] SaveTicketReplyRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketDetailDto>.Fail("Invalid token."));

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var saved = await _ticketService.AddReplyAsync(userId, ip, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<TicketDetailDto>.Fail("Unable to save reply."))
            : Ok(ApiResponse<TicketDetailDto>.Ok(saved, "Reply saved."));
    }

    [HttpPost("{ticketId:long}/acknowledge")]
    public async Task<IActionResult> Acknowledge(long ticketId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid token."));

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var acknowledged = await _ticketService.AcknowledgeAsync(ticketId, userId, ip, cancellationToken).ConfigureAwait(false);
        return acknowledged
            ? Ok(ApiResponse<bool>.Ok(true, "Ticket acknowledged."))
            : Ok(ApiResponse<bool>.Fail("Unable to acknowledge ticket."));
    }

    [HttpPost("{ticketId:long}/close")]
    public async Task<IActionResult> Close(long ticketId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid token."));

        var closed = await _ticketService.CloseAsync(ticketId, userId, cancellationToken).ConfigureAwait(false);
        return closed
            ? Ok(ApiResponse<bool>.Ok(true, "Ticket closed."))
            : Ok(ApiResponse<bool>.Fail("Only the ticket creator can close this ticket."));
    }

    [HttpPost("upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadFile(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("File is required."));

        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "Tickets");
        Directory.CreateDirectory(uploadDir);
        var storedName = $"{Guid.NewGuid():N}_{Path.GetFileName(file.FileName)}";
        var fullPath = Path.Combine(uploadDir, storedName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken).ConfigureAwait(false);
        }

        return Ok(ApiResponse<string>.Ok(storedName, "File uploaded."));
    }

    [HttpDelete("{ticketId:long}")]
    public async Task<IActionResult> Delete(long ticketId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid token."));

        var deleted = await _ticketService.DeleteAsync(ticketId, userId, cancellationToken).ConfigureAwait(false);
        return deleted
            ? Ok(ApiResponse<bool>.Ok(true, "Ticket deleted."))
            : Ok(ApiResponse<bool>.Fail("Unable to delete ticket."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
