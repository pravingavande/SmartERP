using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Leave;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class LeaveController : ControllerBase
{
    private readonly ILeaveService _leaveService;

    public LeaveController(ILeaveService leaveService)
    {
        _leaveService = leaveService;
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetLeaveTypes(CancellationToken cancellationToken)
    {
        var items = await _leaveService.GetLeaveTypeListAsync(cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<LeaveTypeDto>>.Ok(items));
    }

    [HttpPost("types")]
    public async Task<IActionResult> SaveLeaveType([FromBody] SaveLeaveTypeRequestDto request, CancellationToken cancellationToken)
    {
        var saved = await _leaveService.SaveLeaveTypeAsync(request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<LeaveTypeDto>.Fail("Leave type name is required."))
            : Ok(ApiResponse<LeaveTypeDto>.Ok(saved, "Leave type saved."));
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<LeaveApplyLookupsBundleDto>.Fail("Invalid token."));

        var lookups = await _leaveService.GetLeaveApplyLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<LeaveApplyLookupsBundleDto>.Ok(lookups));
    }

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var items = await _leaveService.GetEmployeesByOrgAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<EmployeeOptionDto>>.Ok(items));
    }

    [HttpGet("next-record-no")]
    public async Task<IActionResult> GetNextRecordNo([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var next = await _leaveService.GetNextRecordNoAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<NextRecordNoDto>.Ok(new NextRecordNoDto { NextRecordNo = next }));
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] long? orgId, [FromQuery] long? ayId, CancellationToken cancellationToken)
    {
        var items = await _leaveService.GetLeaveApplyListAsync(orgId, ayId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<LeaveApplyListItemDto>>.Ok(items));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken)
    {
        var item = await _leaveService.GetLeaveApplyByIdAsync(id, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<LeaveApplyDto>.Fail("Leave application not found."))
            : Ok(ApiResponse<LeaveApplyDto>.Ok(item));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveLeaveApplyRequestDto request, CancellationToken cancellationToken)
    {
        var saved = await _leaveService.SaveLeaveApplyAsync(request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<LeaveApplyDto>.Fail("Unable to save leave application. Check required fields."))
            : Ok(ApiResponse<LeaveApplyDto>.Ok(saved, "Leave application saved."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
