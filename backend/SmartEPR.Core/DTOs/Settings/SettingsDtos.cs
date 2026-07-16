using System.Text.Json.Serialization;

namespace SmartEPR.Core.DTOs.Settings;

public sealed class SoftwareLanguageDto
{
    public long SrNo { get; init; }
    public long? UnderOrgID { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Condition { get; init; } = "E";
    public string? Description { get; init; }
}

public sealed class SaveSoftwareLanguageRequestDto
{
    [JsonPropertyName("underOrgID")]
    public long UnderOrgID { get; set; }

    /// <summary>M = Marathi, E = English</summary>
    [JsonPropertyName("condition")]
    public string Condition { get; set; } = "E";
}

public sealed class LanguageKeyValueDto
{
    public int ID { get; init; }
    public string KeyName { get; init; } = string.Empty;
    public string KeyValueMR { get; init; } = string.Empty;
    public string KeyValueEN { get; init; } = string.Empty;
}
