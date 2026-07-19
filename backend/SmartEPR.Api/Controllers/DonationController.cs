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
    private readonly IDonationReportService _donationReportService;
    private readonly ITicketService _ticketService;

    public DonationController(
        IDonationService donationService,
        IDonationReportService donationReportService,
        ITicketService ticketService)
    {
        _donationService = donationService;
        _donationReportService = donationReportService;
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
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketDetailDto>.Fail("Invalid token."));

        var item = await _ticketService.GetDetailAsync(ticketId, userId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<TicketDetailDto>.Fail("Ticket not found."))
            : Ok(ApiResponse<TicketDetailDto>.Ok(item));
    }

    [HttpPost("tickets")]
    public async Task<IActionResult> SaveTicket([FromBody] SaveTicketRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<TicketDetailDto>.Fail("Invalid token."));

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var saved = await _ticketService.SaveAsync(userId, ip, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<TicketDetailDto>.Fail("Unable to save ticket."))
            : Ok(ApiResponse<TicketDetailDto>.Ok(saved, "Ticket saved."));
    }

    [HttpDelete("tickets/{ticketId:long}")]
    public async Task<IActionResult> DeleteTicket(long ticketId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid token."));

        var deleted = await _ticketService.DeleteAsync(ticketId, userId, cancellationToken).ConfigureAwait(false);
        return deleted
            ? Ok(ApiResponse<bool>.Ok(true, "Ticket deleted."))
            : Ok(ApiResponse<bool>.Fail("Unable to delete ticket."));
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

    [HttpGet("{drId:long}/report/pdf")]
    public async Task<IActionResult> GetReceiptPdf(long drId, CancellationToken cancellationToken)
    {
        var pdf = await _donationReportService.RenderDonationReceiptPdfAsync(drId, cancellationToken).ConfigureAwait(false);
        if (pdf is null || pdf.Length == 0)
            return NotFound(ApiResponse<bool>.Fail("Donation receipt report not found."));

        var fileName = $"DonationReceipt-{drId}.pdf";
        return File(pdf, "application/pdf", fileName);
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

    [HttpGet("dr-head-master")]
    public async Task<IActionResult> GetDRHeadMaster([FromQuery] long? underOrgId, CancellationToken cancellationToken)
    {
        var items = await _donationService.GetDRHeadMasterAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<DRHeadOptionDto>>.Ok(items));
    }

    [HttpGet("dr-head-master/list")]
    public async Task<IActionResult> GetDRHeadList([FromQuery] long underOrgId, CancellationToken cancellationToken)
    {
        var items = await _donationService.GetDRHeadListAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<DRHeadMasterDto>>.Ok(items));
    }

    [HttpGet("dr-head-master/next-sr-no")]
    public async Task<IActionResult> GetNextDRHeadSrNo([FromQuery] long underOrgId, CancellationToken cancellationToken)
    {
        var no = await _donationService.GetNextDRHeadSrNoAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<long>.Ok(no));
    }

    [HttpGet("dr-head-master/{drHeadId:long}")]
    public async Task<IActionResult> GetDRHead(long drHeadId, CancellationToken cancellationToken)
    {
        var item = await _donationService.GetDRHeadByIdAsync(drHeadId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<DRHeadMasterDto>.Fail("Donation head not found."))
            : Ok(ApiResponse<DRHeadMasterDto>.Ok(item));
    }

    [HttpPost("dr-head-master")]
    public async Task<IActionResult> SaveDRHead([FromBody] SaveDRHeadMasterRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _donationService.SaveDRHeadAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<DRHeadMasterDto>.Fail(error ?? "Unable to save donation head."))
            : Ok(ApiResponse<DRHeadMasterDto>.Ok(data, "Donation head saved."));
    }

    [HttpPost("dr-head-master/import")]
    public async Task<IActionResult> ImportDRHeads([FromBody] ImportDRHeadRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _donationService.ImportDRHeadsAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<ImportDRHeadResultDto>.Fail(error ?? "Unable to import donation heads."))
            : Ok(ApiResponse<ImportDRHeadResultDto>.Ok(
                data,
                $"Imported {data.ImportedCount} donation head(s). Skipped {data.SkippedCount}."));
    }

    [HttpDelete("dr-head-master/{drHeadId:long}")]
    public async Task<IActionResult> DeleteDRHead(long drHeadId, CancellationToken cancellationToken)
    {
        var (success, error) = await _donationService.DeleteDRHeadAsync(drHeadId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Donation head deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete donation head."));
    }

    [HttpGet("dr-heads")]
    public async Task<IActionResult> GetDRHeadsForOrg([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var items = await _donationService.GetDRHeadsForOrgAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<DRHeadOptionDto>>.Ok(items));
    }

    [HttpGet("dr-head-define")]
    public async Task<IActionResult> GetDRHeadDefine([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var item = await _donationService.GetDRHeadDefineAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<DRHeadDefineDto>.Ok(item));
    }

    [HttpPost("dr-head-define")]
    public async Task<IActionResult> SaveDRHeadDefine([FromBody] SaveDRHeadDefineRequestDto request, CancellationToken cancellationToken)
    {
        if (request.OrgID <= 0)
            return Ok(ApiResponse<bool>.Fail("Org is required."));

        await _donationService.SaveDRHeadDefineAsync(request, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Donation heads saved."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
