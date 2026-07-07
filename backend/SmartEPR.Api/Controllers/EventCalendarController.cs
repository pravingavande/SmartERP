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

    public EventCalendarController(IEventCalendarService service)
    {
        _service = service;
    }

    [HttpGet("event-types")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<EventTypeDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEventTypes(CancellationToken cancellationToken)
    {
        var types = await _service.GetEventTypesAsync(cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<EventTypeDto>>.Ok(types));
    }

    [HttpGet("events")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CalendarEventDto>>), StatusCodes.Status200OK)]
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
    [ProducesResponseType(typeof(ApiResponse<CalendarEventDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEvent(int eventId, CancellationToken cancellationToken)
    {
        var item = await _service.GetEventByIdAsync(eventId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<CalendarEventDto>.Fail("Event not found."))
            : Ok(ApiResponse<CalendarEventDto>.Ok(item));
    }

    [HttpPost("events")]
    [ProducesResponseType(typeof(ApiResponse<CalendarEventDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveEvent([FromBody] SaveEventRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<CalendarEventDto>.Fail("Invalid token."));

        if (string.IsNullOrWhiteSpace(request.Title))
            return Ok(ApiResponse<CalendarEventDto>.Fail("Title is required."));

        var saved = await _service.SaveEventAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<CalendarEventDto>.Fail("Unable to save event."))
            : Ok(ApiResponse<CalendarEventDto>.Ok(saved, "Event saved."));
    }

    [HttpDelete("events/{eventId:int}")]
    public async Task<IActionResult> DeleteEvent(int eventId, CancellationToken cancellationToken)
    {
        await _service.DeleteEventAsync(eventId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Event deleted."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return long.TryParse(claim, out userId);
    }
}
