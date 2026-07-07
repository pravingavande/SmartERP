namespace SmartEPR.Core.Entities;

public sealed class HolidayItem
{
    public int HolidayId { get; init; }
    public DateTime HolidayDate { get; init; }
    public string NameMr { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string HolidayType { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public int Year { get; init; }
}
