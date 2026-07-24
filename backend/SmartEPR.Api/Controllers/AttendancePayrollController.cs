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
[Route("api/attendance/payroll")]
public sealed class AttendancePayrollController : ControllerBase
{
    private readonly IAttendancePayrollService _payrollService;

    public AttendancePayrollController(IAttendancePayrollService payrollService)
    {
        _payrollService = payrollService;
    }

    [HttpGet("team")]
    public async Task<IActionResult> GetTeam(
        [FromQuery] long orgId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<IReadOnlyList<AttendancePayrollRowDto>>.Fail("Organization is required."));

        var rows = await _payrollService.GetTeamPayrollAsync(orgId, year ?? 0, month ?? 0, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AttendancePayrollRowDto>>.Ok(rows));
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMy(
        [FromQuery] long orgId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<AttendancePayrollRowDto>.Fail("Invalid token."));

        if (orgId <= 0)
            return Ok(ApiResponse<AttendancePayrollRowDto>.Fail("Organization is required."));

        var row = await _payrollService.GetMyPayrollAsync(orgId, userId, year ?? 0, month ?? 0, cancellationToken).ConfigureAwait(false);
        return row is null
            ? Ok(ApiResponse<AttendancePayrollRowDto>.Fail("Payroll not found."))
            : Ok(ApiResponse<AttendancePayrollRowDto>.Ok(row));
    }

    [HttpGet("employee/{userId:long}")]
    public async Task<IActionResult> GetEmployee(
        long userId,
        [FromQuery] long orgId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<AttendancePayrollRowDto>.Fail("Organization is required."));

        var row = await _payrollService.GetEmployeePayrollAsync(orgId, userId, year ?? 0, month ?? 0, cancellationToken).ConfigureAwait(false);
        return row is null
            ? Ok(ApiResponse<AttendancePayrollRowDto>.Fail("Employee payroll not found."))
            : Ok(ApiResponse<AttendancePayrollRowDto>.Ok(row));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return claim is not null && long.TryParse(claim, out userId);
    }
}
