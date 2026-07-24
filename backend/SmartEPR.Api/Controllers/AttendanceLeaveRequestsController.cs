using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/attendance/leave-requests")]
public sealed class AttendanceLeaveRequestsController : ControllerBase
{
    private readonly IAttendanceLeaveRequestService _leaveRequestService;

    public AttendanceLeaveRequestsController(IAttendanceLeaveRequestService leaveRequestService)
    {
        _leaveRequestService = leaveRequestService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] long orgId,
        [FromQuery] string? status,
        [FromQuery] long? userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<IReadOnlyList<AttendanceLeaveRequestDto>>.Fail("Organization is required."));

        var items = await _leaveRequestService.GetListAsync(orgId, status, userId, from, to, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AttendanceLeaveRequestDto>>.Ok(items));
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMy(
        [FromQuery] long orgId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<AttendanceLeaveRequestMyDto>>.Fail("Invalid token."));

        if (orgId <= 0)
            return Ok(ApiResponse<IReadOnlyList<AttendanceLeaveRequestMyDto>>.Fail("Organization is required."));

        var items = await _leaveRequestService.GetMyAsync(userId, orgId, from, to, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AttendanceLeaveRequestMyDto>>.Ok(items));
    }

    [HttpPost]
    public async Task<IActionResult> Apply([FromBody] ApplyAttendanceLeaveRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AttendanceLeaveRequestDto>.Fail("Invalid token."));

        var (data, error) = await _leaveRequestService.ApplyAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AttendanceLeaveRequestDto>.Fail(error ?? "Unable to submit leave request."))
            : Ok(ApiResponse<AttendanceLeaveRequestDto>.Ok(data, "Leave request submitted."));
    }

    [HttpPatch("{id:long}/review")]
    public async Task<IActionResult> Review(long id, [FromBody] ReviewAttendanceLeaveRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var reviewerUserId))
            return Unauthorized(ApiResponse<AttendanceLeaveRequestReviewResultDto>.Fail("Invalid token."));

        var (data, error) = await _leaveRequestService.ReviewAsync(id, reviewerUserId, request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AttendanceLeaveRequestReviewResultDto>.Fail(error ?? "Unable to review leave request."))
            : Ok(ApiResponse<AttendanceLeaveRequestReviewResultDto>.Ok(data, "Leave request reviewed."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return claim is not null && long.TryParse(claim, out userId);
    }
}
