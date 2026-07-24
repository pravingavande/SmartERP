using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/attendance/stats")]
public sealed class AttendanceStatsController : ControllerBase
{
    private readonly IAttendanceStatsService _statsService;

    public AttendanceStatsController(IAttendanceStatsService statsService)
    {
        _statsService = statsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetStats(
        [FromQuery] long orgId,
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<AttendanceStatsDto>.Fail("Organization is required."));

        var stats = await _statsService.GetStatsAsync(orgId, date, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<AttendanceStatsDto>.Ok(stats));
    }
}
