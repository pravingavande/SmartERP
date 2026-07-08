using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class AuditController : ControllerBase
{
    private readonly IAuditVoucherService _auditService;

    public AuditController(IAuditVoucherService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<AuditDashboardRowDto>>.Fail("Invalid token."));

        var rows = await _auditService.GetDashboardAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AuditDashboardRowDto>>.Ok(rows));
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AuditLookupsDto>.Fail("Invalid token."));

        var lookups = await _auditService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<AuditLookupsDto>.Ok(lookups));
    }

    [HttpGet("account-registers")]
    public async Task<IActionResult> GetAccountRegisters([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var items = await _auditService.GetAccountRegistersAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AccountRegisterOptionDto>>.Ok(items));
    }

    [HttpGet("parties")]
    public async Task<IActionResult> GetParties([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var items = await _auditService.GetPartiesAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<PartyOptionDto>>.Ok(items));
    }

    [HttpGet("ledger-narrations")]
    public async Task<IActionResult> GetLedgerNarrations([FromQuery] long ledgerHeadId, CancellationToken cancellationToken)
    {
        var items = await _auditService.GetLedgerNarrationsAsync(ledgerHeadId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<string>>.Ok(items));
    }

    [HttpGet("next-vcode")]
    public async Task<IActionResult> GetNextVCode([FromQuery] long orgId, [FromQuery] long accountRegisterId, [FromQuery] long fyId, [FromQuery] string vType, CancellationToken cancellationToken)
    {
        var code = await _auditService.GetNextVCodeAsync(orgId, accountRegisterId, fyId, vType, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<long>.Ok(code));
    }

    [HttpGet("vouchers")]
    public async Task<IActionResult> GetVouchers([FromQuery] long orgId, [FromQuery] string vType, [FromQuery] long? fyId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<VoucherListItemDto>>.Fail("Invalid token."));

        var items = await _auditService.GetVoucherListAsync(userId, orgId, vType, fyId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<VoucherListItemDto>>.Ok(items));
    }

    [HttpGet("vouchers/{voucherId:long}")]
    public async Task<IActionResult> GetVoucher(long voucherId, CancellationToken cancellationToken)
    {
        var item = await _auditService.GetVoucherByIdAsync(voucherId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<VoucherDto>.Fail("Voucher not found."))
            : Ok(ApiResponse<VoucherDto>.Ok(item));
    }

    [HttpPost("vouchers")]
    public async Task<IActionResult> SaveVoucher([FromBody] SaveVoucherRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<VoucherDto>.Fail("Invalid token."));

        var saved = await _auditService.SaveVoucherAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<VoucherDto>.Fail("Unable to save voucher. Add at least one detail line."))
            : Ok(ApiResponse<VoucherDto>.Ok(saved, "Voucher saved."));
    }

    [HttpDelete("vouchers/{voucherId:long}")]
    public async Task<IActionResult> DeleteVoucher(long voucherId, CancellationToken cancellationToken)
    {
        await _auditService.DeleteVoucherAsync(voucherId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Voucher deleted."));
    }

    [HttpGet("account-register-master")]
    public async Task<IActionResult> GetAccountRegisterMaster(CancellationToken cancellationToken)
    {
        var items = await _auditService.GetAccountRegisterMasterAsync(cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AccountRegisterMasterOptionDto>>.Ok(items));
    }

    [HttpGet("account-register-define")]
    public async Task<IActionResult> GetAccountRegisterDefine([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var item = await _auditService.GetAccountRegisterDefineAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<AccountRegisterDefineDto>.Ok(item));
    }

    [HttpPost("account-register-define")]
    public async Task<IActionResult> SaveAccountRegisterDefine([FromBody] SaveAccountRegisterDefineRequestDto request, CancellationToken cancellationToken)
    {
        if (request.OrgID <= 0)
            return Ok(ApiResponse<bool>.Fail("Org is required."));

        await _auditService.SaveAccountRegisterDefineAsync(request, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Account registers saved."));
    }

    [HttpGet("party-master")]
    public async Task<IActionResult> GetPartyList([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var items = await _auditService.GetPartyListAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<PartyMasterDto>>.Ok(items));
    }

    [HttpGet("party-master/{partyId:long}")]
    public async Task<IActionResult> GetParty(long partyId, CancellationToken cancellationToken)
    {
        var item = await _auditService.GetPartyByIdAsync(partyId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<PartyMasterDto>.Fail("Party not found."))
            : Ok(ApiResponse<PartyMasterDto>.Ok(item));
    }

    [HttpPost("party-master")]
    public async Task<IActionResult> SaveParty([FromBody] SavePartyRequestDto request, CancellationToken cancellationToken)
    {
        var saved = await _auditService.SavePartyAsync(request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<PartyMasterDto>.Fail("Unable to save party. Party name is required."))
            : Ok(ApiResponse<PartyMasterDto>.Ok(saved, "Party saved."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
