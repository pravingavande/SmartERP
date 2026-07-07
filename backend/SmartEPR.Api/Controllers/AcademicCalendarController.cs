using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Calendar;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class AcademicCalendarController : ControllerBase
{
    private readonly IAcademicCalendarService _service;

    public AcademicCalendarController(IAcademicCalendarService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<AcademicCalendarDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCalendar([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken cancellationToken)
    {
        var fromDate = from?.Date ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var toDate = to?.Date ?? fromDate.AddMonths(1).AddDays(-1);

        var data = await _service.GetCalendarAsync(fromDate, toDate, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<AcademicCalendarDto>.Ok(data));
    }

    [HttpPost("holidays")]
    [ProducesResponseType(typeof(ApiResponse<HolidayDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveHoliday([FromBody] SaveHolidayRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NameMr) || string.IsNullOrWhiteSpace(request.NameEn))
            return Ok(ApiResponse<HolidayDto>.Fail("Holiday name is required."));

        var saved = await _service.SaveHolidayAsync(request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<HolidayDto>.Fail("Unable to save holiday."))
            : Ok(ApiResponse<HolidayDto>.Ok(saved, "Holiday saved."));
    }

    [HttpDelete("holidays/{holidayId:int}")]
    public async Task<IActionResult> DeleteHoliday(int holidayId, CancellationToken cancellationToken)
    {
        await _service.DeleteHolidayAsync(holidayId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Holiday deleted."));
    }

    [HttpPost("festivals")]
    [ProducesResponseType(typeof(ApiResponse<FestivalDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveFestival([FromBody] SaveFestivalRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NameMr) || string.IsNullOrWhiteSpace(request.NameEn))
            return Ok(ApiResponse<FestivalDto>.Fail("Festival name is required."));

        var saved = await _service.SaveFestivalAsync(request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<FestivalDto>.Fail("Unable to save festival."))
            : Ok(ApiResponse<FestivalDto>.Ok(saved, "Festival saved."));
    }

    [HttpDelete("festivals/{festivalId:int}")]
    public async Task<IActionResult> DeleteFestival(int festivalId, CancellationToken cancellationToken)
    {
        await _service.DeleteFestivalAsync(festivalId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<bool>.Ok(true, "Festival deleted."));
    }
}
