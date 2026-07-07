namespace SmartEPR.Core.Entities;

public sealed class FestivalItem
{
    public int FestivalId { get; init; }
    public DateTime FestivalDate { get; init; }
    public string NameMr { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public int Year { get; init; }
}
