using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Donation;
using SmartEPR.Core.DTOs.Ticket;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class DonationController : ControllerBase
{
    private readonly IDonationService _donationService;
    private readonly ITicketService _ticketService;

    public DonationController(IDonationService donationService, ITicketService ticketService)
    {
        _donationService = donationService;
        _ticketService = ticketService;
    }
    [HttpGet("ticket-lookups")]
    public async Task<IActionResult> GetTicketLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketLookupsDto>.Fail("Invalid token."));

        var lookups = await _ticketService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<TicketLookupsDto>.Ok(lookups));
    }

    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets([FromQuery] long? orgId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<TicketListItemDto>>.Fail("Invalid token."));

        var items = await _ticketService.GetListAsync(userId, orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<TicketListItemDto>>.Ok(items));
    }

    [HttpGet("tickets/{ticketId:long}")]
    public async Task<IActionResult> GetTicketById(long ticketId, CancellationToken cancellationToken)
    {
        var item = await _ticketService.GetByIdAsync(ticketId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<TicketListItemDto>.Fail("Ticket not found."))
            : Ok(ApiResponse<TicketListItemDto>.Ok(item));
    }

    [HttpPost("tickets")]
    public async Task<IActionResult> SaveTicket([FromBody] SaveTicketRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketListItemDto>.Fail("Invalid token."));

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var saved = await _ticketService.SaveAsync(userId, ip, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<TicketListItemDto>.Fail("Unable to save ticket. School and status are required."))
            : Ok(ApiResponse<TicketListItemDto>.Ok(saved, "Ticket saved."));
    }

    [HttpDelete("tickets/{ticketId:long}")]
    public async Task<IActionResult> DeleteTicket(long ticketId, CancellationToken cancellationToken)
    {
        await _ticketService.DeleteAsync(ticketId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Ticket deleted."));
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<DonationLookupsDto>.Fail("Invalid token."));

        var lookups = await _donationService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<DonationLookupsDto>.Ok(lookups));
    }

    [HttpGet("next-receipt-no")]
    public async Task<IActionResult> GetNextReceiptNo([FromQuery] long fyId, CancellationToken cancellationToken)
    {
        var no = await _donationService.GetNextReceiptNoAsync(fyId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<long>.Ok(no));
    }

    [HttpGet("next-org-receipt-no")]
    public async Task<IActionResult> GetNextOrgReceiptNo([FromQuery] long orgId, [FromQuery] long fyId, CancellationToken cancellationToken)
    {
        var no = await _donationService.GetNextOrgReceiptNoAsync(orgId, fyId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<long>.Ok(no));
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] long? orgId, [FromQuery] long? fyId, CancellationToken cancellationToken)
    {
        var items = await _donationService.GetListAsync(orgId, fyId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<DonationListItemDto>>.Ok(items));
    }

    [HttpGet("{drId:long}")]
    public async Task<IActionResult> GetById(long drId, CancellationToken cancellationToken)
    {
        var item = await _donationService.GetByIdAsync(drId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<DonationListItemDto>.Fail("Donation entry not found."))
            : Ok(ApiResponse<DonationListItemDto>.Ok(item));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveDonationRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<DonationListItemDto>.Fail("Invalid token."));

        var saved = await _donationService.SaveAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<DonationListItemDto>.Fail("Unable to save donation. Donor name and amount are required."))
            : Ok(ApiResponse<DonationListItemDto>.Ok(saved, "Donation saved."));
    }

    [HttpDelete("{drId:long}")]
    public async Task<IActionResult> Delete(long drId, CancellationToken cancellationToken)
    {
        await _donationService.DeleteAsync(drId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Donation deleted."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
