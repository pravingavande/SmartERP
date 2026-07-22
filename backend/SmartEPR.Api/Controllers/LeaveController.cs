using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Leave;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class LeaveController : ControllerBase
{
    private readonly ILeaveService _leaveService;
    private readonly IUserRepository _userRepository;

    public LeaveController(ILeaveService leaveService, IUserRepository userRepository)
    {
        _leaveService = leaveService;
        _userRepository = userRepository;
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetLeaveTypes([FromQuery] long orgId, [FromQuery] string? search, CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<IReadOnlyList<LeaveTypeDto>>.Fail("Organization is required."));
        var items = await _leaveService.GetLeaveTypeListAsync(orgId, search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<LeaveTypeDto>>.Ok(items));
    }

    [HttpGet("types/next-srno")]
    public async Task<IActionResult> GetLeaveTypeNextSrNo([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<NextSrNoDto>.Fail("Organization is required."));
        var next = await _leaveService.GetLeaveTypeNextSrNoAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<NextSrNoDto>.Ok(new NextSrNoDto { NextSrNo = (int)next }));
    }

    [HttpPost("types")]
    public async Task<IActionResult> SaveLeaveType([FromBody] SaveLeaveTypeRequestDto request, CancellationToken cancellationToken)
    {
        var saved = await _leaveService.SaveLeaveTypeAsync(request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<LeaveTypeDto>.Fail("Leave type name and organization are required."))
            : Ok(ApiResponse<LeaveTypeDto>.Ok(saved, "Leave type saved."));
    }

    [HttpDelete("types/{id:long}")]
    public async Task<IActionResult> DeleteLeaveType(long id, CancellationToken cancellationToken)
    {
        var ok = await _leaveService.DeleteLeaveTypeAsync(id, cancellationToken).ConfigureAwait(false);
        return ok
            ? Ok(ApiResponse<bool>.Ok(true, "Leave type deactivated."))
            : Ok(ApiResponse<bool>.Fail("Unable to delete leave type."));
    }

    [HttpPost("types/import")]
    public async Task<IActionResult> ImportLeaveTypes([FromBody] ImportLeaveTypeRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _leaveService.ImportLeaveTypesAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<ImportClassResultDto>.Fail(error ?? "Unable to import leave types."))
            : Ok(ApiResponse<ImportClassResultDto>.Ok(
                data,
                $"Imported {data.ImportedCount} leave type(s). Skipped {data.SkippedCount}."));
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
        if (request.UserLeaveApplyID > 0 && await IsEmployeeUserAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<LeaveApplyDto>.Fail("Employees cannot edit leave applications after submission. Contact admin."));

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

    private async Task<bool> IsEmployeeUserAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return false;

        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        return profile?.UserRoleID == 3;
    }
}
