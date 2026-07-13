using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Calendar;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class EventCalendarController : ControllerBase
{
    private readonly IEventCalendarService _service;
    private readonly IWebHostEnvironment _environment;

    public EventCalendarController(IEventCalendarService service, IWebHostEnvironment environment)
    {
        _service = service;
        _environment = environment;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<EventLookupsDto>.Fail("Invalid token."));

        var lookups = await _service.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<EventLookupsDto>.Ok(lookups));
    }

    [HttpGet("event-types")]
    public async Task<IActionResult> GetEventTypes([FromQuery] long? underOrgId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<EventTypeDto>>.Fail("Invalid token."));

        var types = underOrgId.HasValue
            ? await _service.GetEventTypeMasterListAsync(userId, underOrgId, cancellationToken).ConfigureAwait(false)
            : (await _service.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false)).EventTypes;

        return Ok(ApiResponse<IReadOnlyList<EventTypeDto>>.Ok(types));
    }

    [HttpPost("event-types")]
    public async Task<IActionResult> SaveEventType([FromBody] SaveEventTypeRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<EventTypeDto>.Fail("Invalid token."));

        if (request.UnderOrgID <= 0)
            return Ok(ApiResponse<EventTypeDto>.Fail("Organization is required."));

        if (string.IsNullOrWhiteSpace(request.EventType))
            return Ok(ApiResponse<EventTypeDto>.Fail("Event Type is required."));

        var saved = await _service.SaveEventTypeAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<EventTypeDto>.Fail("Unable to save event type. Check permissions and required fields."))
            : Ok(ApiResponse<EventTypeDto>.Ok(saved, "Event type saved."));
    }

    [HttpDelete("event-types/{eventTypeId:int}")]
    public async Task<IActionResult> DeleteEventType(int eventTypeId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid token."));

        var deleted = await _service.DeleteEventTypeAsync(userId, eventTypeId, cancellationToken).ConfigureAwait(false);
        return deleted
            ? Ok(ApiResponse<bool>.Ok(true, "Event type deleted."))
            : Ok(ApiResponse<bool>.Fail("Unable to delete event type."));
    }

    [HttpGet("locations")]
    public async Task<IActionResult> SearchLocations([FromQuery] long underOrgId, [FromQuery] string? search, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<LocationDto>>.Fail("Invalid token."));

        var items = await _service.SearchLocationsAsync(userId, underOrgId, search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<LocationDto>>.Ok(items));
    }

    [HttpPost("locations")]
    public async Task<IActionResult> SaveLocation([FromBody] SaveLocationRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<LocationDto>.Fail("Invalid token."));

        var saved = await _service.SaveLocationAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<LocationDto>.Fail("Unable to save location."))
            : Ok(ApiResponse<LocationDto>.Ok(saved, "Location saved."));
    }

    [HttpGet("pending-reporting")]
    public async Task<IActionResult> GetPendingReporting(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<PendingEventReportingSummaryDto>.Fail("Invalid token."));

        var summary = await _service.GetPendingReportingAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<PendingEventReportingSummaryDto>.Ok(summary));
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? search, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<CalendarEventDto>>.Fail("Invalid token."));

        var fromDate = from?.Date ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var toDate = to?.Date ?? fromDate.AddMonths(1).AddDays(-1);
        var events = await _service.GetEventsAsync(userId, fromDate, toDate, search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<CalendarEventDto>>.Ok(events));
    }

    [HttpGet("events/{eventId:int}")]
    public async Task<IActionResult> GetEvent(int eventId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<CalendarEventDto>.Fail("Invalid token."));

        var item = await _service.GetEventByIdAsync(userId, eventId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<CalendarEventDto>.Fail("Event not found."))
            : Ok(ApiResponse<CalendarEventDto>.Ok(item));
    }

    [HttpPost("events")]
    public async Task<IActionResult> SaveEvent([FromBody] SaveEventRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<CalendarEventDto>.Fail("Invalid token."));

        if (string.IsNullOrWhiteSpace(request.Title))
            return Ok(ApiResponse<CalendarEventDto>.Fail("Title is required."));

        if (string.IsNullOrWhiteSpace(request.Location))
            return Ok(ApiResponse<CalendarEventDto>.Fail("Location is required."));

        if (request.OrgIDs is null || request.OrgIDs.Count == 0)
            return Ok(ApiResponse<CalendarEventDto>.Fail("At least one school is required."));

        var saved = await _service.SaveEventAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<CalendarEventDto>.Fail("Unable to save event."))
            : Ok(ApiResponse<CalendarEventDto>.Ok(saved, "Event saved."));
    }

    [HttpPost("upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadFile(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return Ok(ApiResponse<string>.Fail("File is required."));

        var uploadDir = Path.Combine(_environment.ContentRootPath, "Uploads", "Events");
        Directory.CreateDirectory(uploadDir);
        var storedName = $"{Guid.NewGuid():N}_{Path.GetFileName(file.FileName)}";
        var fullPath = Path.Combine(uploadDir, storedName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken).ConfigureAwait(false);
        }

        return Ok(ApiResponse<string>.Ok(storedName, "File uploaded."));
    }

    [HttpDelete("events/{eventId:int}")]
    public async Task<IActionResult> DeleteEvent(int eventId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid token."));

        var deleted = await _service.DeleteEventAsync(userId, eventId, cancellationToken).ConfigureAwait(false);
        return deleted
            ? Ok(ApiResponse<bool>.Ok(true, "Event deleted."))
            : Ok(ApiResponse<bool>.Fail("Unable to delete event."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
