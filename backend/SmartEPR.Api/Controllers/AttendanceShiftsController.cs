using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/attendance/shifts")]
public sealed class AttendanceShiftsController : ControllerBase
{
    private readonly IAttendanceShiftService _shiftService;

    public AttendanceShiftsController(IAttendanceShiftService shiftService)
    {
        _shiftService = shiftService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<IReadOnlyList<AttendanceShiftDto>>.Fail("Organization is required."));

        var items = await _shiftService.GetListAsync(orgId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AttendanceShiftDto>>.Ok(items));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, [FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<AttendanceShiftDto>.Fail("Organization is required."));

        var item = await _shiftService.GetByIdAsync(id, orgId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<AttendanceShiftDto>.Fail("Shift not found."))
            : Ok(ApiResponse<AttendanceShiftDto>.Ok(item));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveAttendanceShiftRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _shiftService.CreateAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AttendanceShiftDto>.Fail(error ?? "Unable to create shift."))
            : Ok(ApiResponse<AttendanceShiftDto>.Ok(data, "Shift created."));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateAttendanceShiftRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _shiftService.UpdateAsync(id, request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<AttendanceShiftDto>.Fail(error ?? "Unable to update shift."))
            : Ok(ApiResponse<AttendanceShiftDto>.Ok(data, "Shift updated."));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, [FromQuery] long orgId, CancellationToken cancellationToken)
    {
        var (success, error) = await _shiftService.DeleteAsync(id, orgId, cancellationToken).ConfigureAwait(false);
        return success
            ? Ok(ApiResponse<bool>.Ok(true, "Shift deleted."))
            : Ok(ApiResponse<bool>.Fail(error ?? "Unable to delete shift."));
    }
}
