using SmartEPR.Core.DTOs.Calendar;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class AcademicCalendarService : IAcademicCalendarService
{
    private readonly IAcademicCalendarRepository _repository;

    public AcademicCalendarService(IAcademicCalendarRepository repository)
    {
        _repository = repository;
    }

    public async Task<AcademicCalendarDto> GetCalendarAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default)
    {
        var holidays = await _repository.GetHolidaysAsync(fromDate, toDate, cancellationToken).ConfigureAwait(false);
        var festivals = await _repository.GetFestivalsAsync(fromDate, toDate, cancellationToken).ConfigureAwait(false);

        return new AcademicCalendarDto
        {
            Holidays = holidays.Select(MapHoliday).ToList(),
            Festivals = festivals.Select(MapFestival).ToList()
        };
    }

    public async Task<HolidayDto?> SaveHolidayAsync(SaveHolidayRequestDto request, CancellationToken cancellationToken = default)
    {
        var id = await _repository.SaveHolidayAsync(new HolidayItem
        {
            HolidayId = request.HolidayId ?? 0,
            HolidayDate = request.HolidayDate,
            NameMr = request.NameMr.Trim(),
            NameEn = request.NameEn.Trim(),
            HolidayType = request.HolidayType,
            Color = request.Color,
            Year = request.Year
        }, cancellationToken).ConfigureAwait(false);

        var items = await _repository.GetHolidaysAsync(request.HolidayDate, request.HolidayDate, cancellationToken).ConfigureAwait(false);
        var saved = items.FirstOrDefault(h => h.HolidayId == id);
        return saved is null ? null : MapHoliday(saved);
    }

    public async Task<FestivalDto?> SaveFestivalAsync(SaveFestivalRequestDto request, CancellationToken cancellationToken = default)
    {
        var id = await _repository.SaveFestivalAsync(new FestivalItem
        {
            FestivalId = request.FestivalId ?? 0,
            FestivalDate = request.FestivalDate,
            NameMr = request.NameMr.Trim(),
            NameEn = request.NameEn.Trim(),
            Color = request.Color,
            Year = request.Year
        }, cancellationToken).ConfigureAwait(false);

        var items = await _repository.GetFestivalsAsync(request.FestivalDate, request.FestivalDate, cancellationToken).ConfigureAwait(false);
        var saved = items.FirstOrDefault(f => f.FestivalId == id);
        return saved is null ? null : MapFestival(saved);
    }

    public async Task<bool> DeleteHolidayAsync(int holidayId, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteHolidayAsync(holidayId, cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool> DeleteFestivalAsync(int festivalId, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteFestivalAsync(festivalId, cancellationToken).ConfigureAwait(false);
        return true;
    }

    private static HolidayDto MapHoliday(HolidayItem item) => new()
    {
        HolidayId = item.HolidayId,
        HolidayDate = item.HolidayDate,
        NameMr = item.NameMr,
        NameEn = item.NameEn,
        HolidayType = item.HolidayType,
        Color = item.Color,
        Year = item.Year
    };

    private static FestivalDto MapFestival(FestivalItem item) => new()
    {
        FestivalId = item.FestivalId,
        FestivalDate = item.FestivalDate,
        NameMr = item.NameMr,
        NameEn = item.NameEn,
        Color = item.Color,
        Year = item.Year
    };
}
