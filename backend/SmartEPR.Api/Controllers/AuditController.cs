using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Interfaces;
using SmartEPR.Core.Validation;

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
    public async Task<IActionResult> GetDashboard([FromQuery] long? fyId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AuditDashboardResponseDto>.Fail("Invalid token."));

        var page = await _auditService.GetDashboardPageAsync(userId, fyId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<AuditDashboardResponseDto>.Ok(page));
    }

    [HttpGet("dashboard/cash-summary")]
    public async Task<IActionResult> GetCashSummary(
        [FromQuery] long? fyId,
        [FromQuery] long? orgId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AuditCashSummaryResponseDto>.Fail("Invalid token."));

        var page = await _auditService.GetCashSummaryAsync(userId, fyId, orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<AuditCashSummaryResponseDto>.Ok(page));
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AuditLookupsDto>.Fail("Invalid token."));

        var lookups = await _auditService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<AuditLookupsDto>.Ok(lookups));
    }

    [HttpGet("sanstha-orgs")]
    public async Task<IActionResult> GetSansthaOrgs(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<OrgOptionDto>>.Fail("Invalid token."));

        var orgs = await _auditService.GetSansthaOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<OrgOptionDto>>.Ok(orgs));
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

        if (AuditVoucherRules.ValidateSaveOrUpdate(request) is { } validationError)
            return Ok(ApiResponse<VoucherDto>.Fail(validationError));

        var saved = await _auditService.SaveVoucherAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<VoucherDto>.Fail("Unable to save voucher."))
            : Ok(ApiResponse<VoucherDto>.Ok(saved, "Voucher saved."));
    }

    [HttpDelete("vouchers/{voucherId:long}")]
    public async Task<IActionResult> DeleteVoucher(long voucherId, CancellationToken cancellationToken)
    {
        await _auditService.DeleteVoucherAsync(voucherId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Voucher deleted."));
    }

    [HttpGet("account-register-master")]
    public async Task<IActionResult> GetAccountRegisterMaster([FromQuery] long? underOrgId, CancellationToken cancellationToken)
    {
        var items = await _auditService.GetAccountRegisterMasterAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AccountRegisterMasterOptionDto>>.Ok(items));
    }

    [HttpGet("account-register-master/list")]
    public async Task<IActionResult> GetAccountRegisterList([FromQuery] long underOrgId, CancellationToken cancellationToken)
    {
        var items = await _auditService.GetAccountRegisterListAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AccountRegisterMasterDto>>.Ok(items));
    }

    [HttpGet("account-register-master/next-sr-no")]
    public async Task<IActionResult> GetNextAccountRegisterSrNo([FromQuery] long underOrgId, CancellationToken cancellationToken)
    {
        var no = await _auditService.GetNextAccountRegisterSrNoAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<long>.Ok(no));
    }

    [HttpGet("account-register-master/{accountRegisterId:long}")]
    public async Task<IActionResult> GetAccountRegister(long accountRegisterId, CancellationToken cancellationToken)
    {
        var item = await _auditService.GetAccountRegisterByIdAsync(accountRegisterId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<AccountRegisterMasterDto>.Fail("Account register not found."))
            : Ok(ApiResponse<AccountRegisterMasterDto>.Ok(item));
    }

    [HttpPost("account-register-master")]
    public async Task<IActionResult> SaveAccountRegister([FromBody] SaveAccountRegisterMasterRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _auditService.SaveAccountRegisterAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AccountRegisterMasterDto>.Fail(error ?? "Unable to save account register."))
            : Ok(ApiResponse<AccountRegisterMasterDto>.Ok(data, "Account register saved."));
    }

    [HttpPost("account-register-master/import")]
    public async Task<IActionResult> ImportAccountRegisters([FromBody] ImportAccountRegisterRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _auditService.ImportAccountRegistersAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<ImportAccountRegisterResultDto>.Fail(error ?? "Unable to import account registers."))
            : Ok(ApiResponse<ImportAccountRegisterResultDto>.Ok(
                data,
                $"Imported {data.ImportedCount} register(s). Skipped {data.SkippedCount}."));
    }

    [HttpDelete("account-register-master/{accountRegisterId:long}")]
    public async Task<IActionResult> DeleteAccountRegister(long accountRegisterId, CancellationToken cancellationToken)
    {
        var (success, error) = await _auditService.DeleteAccountRegisterAsync(accountRegisterId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Account register deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete account register."));
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

    [HttpGet("ledger-types")]
    public async Task<IActionResult> GetLedgerTypes(CancellationToken cancellationToken)
    {
        var items = await _auditService.GetLedgerTypesAsync(cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<LedgerTypeOptionDto>>.Ok(items));
    }

    [HttpGet("ledger-head-master")]
    public async Task<IActionResult> GetLedgerHeadList([FromQuery] long underOrgId, CancellationToken cancellationToken)
    {
        var items = await _auditService.GetLedgerHeadListAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<LedgerHeadMasterDto>>.Ok(items));
    }

    [HttpGet("ledger-head-master/next-sr-no")]
    public async Task<IActionResult> GetNextLedgerHeadSrNo([FromQuery] long underOrgId, CancellationToken cancellationToken)
    {
        var no = await _auditService.GetNextLedgerHeadSrNoAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<long>.Ok(no));
    }

    [HttpGet("ledger-head-master/{ledgerHeadId:long}")]
    public async Task<IActionResult> GetLedgerHead(long ledgerHeadId, CancellationToken cancellationToken)
    {
        var item = await _auditService.GetLedgerHeadByIdAsync(ledgerHeadId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<LedgerHeadMasterDto>.Fail("Ledger head not found."))
            : Ok(ApiResponse<LedgerHeadMasterDto>.Ok(item));
    }

    [HttpPost("ledger-head-master")]
    public async Task<IActionResult> SaveLedgerHead([FromBody] SaveLedgerHeadRequestDto request, CancellationToken cancellationToken)
    {
        var saved = await _auditService.SaveLedgerHeadAsync(request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<LedgerHeadMasterDto>.Fail("Unable to save ledger head. School, name and type are required."))
            : Ok(ApiResponse<LedgerHeadMasterDto>.Ok(saved, "Ledger head saved."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
