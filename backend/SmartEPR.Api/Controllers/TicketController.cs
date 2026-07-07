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

    public TicketController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketLookupsDto>.Fail("Invalid token."));

        var lookups = await _ticketService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<TicketLookupsDto>.Ok(lookups));
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
        var item = await _ticketService.GetByIdAsync(ticketId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<TicketListItemDto>.Fail("Ticket not found."))
            : Ok(ApiResponse<TicketListItemDto>.Ok(item));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveTicketRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketListItemDto>.Fail("Invalid token."));

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var saved = await _ticketService.SaveAsync(userId, ip, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<TicketListItemDto>.Fail("Unable to save ticket. School and status are required."))
            : Ok(ApiResponse<TicketListItemDto>.Ok(saved, "Ticket saved."));
    }

    [HttpDelete("{ticketId:long}")]
    public async Task<IActionResult> Delete(long ticketId, CancellationToken cancellationToken)
    {
        await _ticketService.DeleteAsync(ticketId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Ticket deleted."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
