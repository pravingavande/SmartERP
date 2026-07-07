namespace SmartEPR.Core.DTOs.Calendar;

public sealed class HolidayDto
{
    public int HolidayId { get; init; }
    public DateTime HolidayDate { get; init; }
    public string NameMr { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string HolidayType { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public int Year { get; init; }
}

public sealed class SaveHolidayRequestDto
{
    public int? HolidayId { get; init; }
    public DateTime HolidayDate { get; init; }
    public string NameMr { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string HolidayType { get; init; } = "national";
    public string Color { get; init; } = "#7b1fa2";
    public int Year { get; init; }
}

public sealed class FestivalDto
{
    public int FestivalId { get; init; }
    public DateTime FestivalDate { get; init; }
    public string NameMr { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public int Year { get; init; }
}

public sealed class SaveFestivalRequestDto
{
    public int? FestivalId { get; init; }
    public DateTime FestivalDate { get; init; }
    public string NameMr { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string Color { get; init; } = "#9c27b0";
    public int Year { get; init; }
}

public sealed class AcademicCalendarDto
{
    public IReadOnlyList<HolidayDto> Holidays { get; init; } = [];
    public IReadOnlyList<FestivalDto> Festivals { get; init; } = [];
}
