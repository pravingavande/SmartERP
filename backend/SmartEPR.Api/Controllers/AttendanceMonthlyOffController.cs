using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/attendance/monthly-off")]
public sealed class AttendanceMonthlyOffController : ControllerBase
{
    private readonly IAttendanceMonthlyOffService _monthlyOffService;

    public AttendanceMonthlyOffController(IAttendanceMonthlyOffService monthlyOffService)
    {
        _monthlyOffService = monthlyOffService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPlan(
        [FromQuery] long orgId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<AttendanceMonthlyOffPlanDto>.Fail("Organization is required."));

        try
        {
            var plan = await _monthlyOffService.GetPlanAsync(
                orgId,
                year ?? 0,
                month ?? 0,
                cancellationToken).ConfigureAwait(false);
            return Ok(ApiResponse<AttendanceMonthlyOffPlanDto>.Ok(plan));
        }
        catch (ArgumentException ex)
        {
            return Ok(ApiResponse<AttendanceMonthlyOffPlanDto>.Fail(ex.Message));
        }
    }

    [HttpPut]
    public async Task<IActionResult> SavePlan(
        [FromBody] SaveAttendanceMonthlyOffRequestDto request,
        CancellationToken cancellationToken)
    {
        var (data, error) = await _monthlyOffService.SaveChangesAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AttendanceMonthlyOffSaveResultDto>.Fail(error ?? "Unable to save monthly week-off plan."))
            : Ok(ApiResponse<AttendanceMonthlyOffSaveResultDto>.Ok(data, "Monthly week-off plan saved."));
    }
}
