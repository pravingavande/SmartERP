using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/attendance/records")]
public sealed class AttendanceRecordsController : ControllerBase
{
    private readonly IAttendanceRecordService _attendanceRecordService;

    public AttendanceRecordsController(IAttendanceRecordService attendanceRecordService)
    {
        _attendanceRecordService = attendanceRecordService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] long orgId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] long? userId,
        CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<IReadOnlyList<AttendanceRecordDto>>.Fail("Organization is required."));

        var items = await _attendanceRecordService.GetListAsync(orgId, from, to, userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<AttendanceRecordDto>>.Ok(items));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, [FromQuery] long orgId, CancellationToken cancellationToken)
    {
        if (orgId <= 0)
            return Ok(ApiResponse<AttendanceRecordDto>.Fail("Organization is required."));

        var item = await _attendanceRecordService.GetByIdAsync(id, orgId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<AttendanceRecordDto>.Fail("Attendance record not found."))
            : Ok(ApiResponse<AttendanceRecordDto>.Ok(item));
    }
}
