using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Dashboard;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly INoticeService _noticeService;

    public DashboardController(IDashboardService dashboardService, INoticeService noticeService)
    {
        _dashboardService = dashboardService;
        _noticeService = noticeService;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(ApiResponse<DashboardSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized(ApiResponse<DashboardSummaryDto>.Fail("Invalid token."));

        var summary = await _dashboardService.GetSummaryAsync(userId, cancellationToken).ConfigureAwait(false);

        if (summary is null)
            return Ok(ApiResponse<DashboardSummaryDto>.Fail("Dashboard summary not available."));

        return Ok(ApiResponse<DashboardSummaryDto>.Ok(summary));
    }

    [HttpGet("notices")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<NoticeItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotices([FromQuery] int count = 10, CancellationToken cancellationToken = default)
    {
        var safeCount = count is < 1 or > 50 ? 10 : count;
        var notices = await _noticeService.GetRecentAsync(safeCount, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<NoticeItemDto>>.Ok(notices));
    }
}
