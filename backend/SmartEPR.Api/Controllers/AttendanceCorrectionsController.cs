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
[Route("api/attendance/corrections")]
public sealed class AttendanceCorrectionsController : ControllerBase
{
    private readonly IAttendanceCorrectionService _correctionService;

    public AttendanceCorrectionsController(IAttendanceCorrectionService correctionService)
    {
        _correctionService = correctionService;
    }

    [HttpPost("reverse")]
    public async Task<IActionResult> Reverse([FromBody] ReverseAttendanceCorrectionRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AttendanceCorrectionResultDto>.Fail("Invalid token."));

        var (data, error) = await _correctionService.ReverseAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AttendanceCorrectionResultDto>.Fail(error ?? "Unable to reverse attendance."))
            : Ok(ApiResponse<AttendanceCorrectionResultDto>.Ok(data, "Attendance reversed."));
    }

    [HttpPost("force-checkout")]
    public async Task<IActionResult> ForceCheckout([FromBody] ForceCheckoutAttendanceRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AttendanceCorrectionResultDto>.Fail("Invalid token."));

        var (data, error) = await _correctionService.ForceCheckoutAsync(userId, request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AttendanceCorrectionResultDto>.Fail(error ?? "Unable to force check-out."))
            : Ok(ApiResponse<AttendanceCorrectionResultDto>.Ok(data, "Employee checked out."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return claim is not null && long.TryParse(claim, out userId);
    }
}
