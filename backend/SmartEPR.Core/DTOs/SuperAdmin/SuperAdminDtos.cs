using System.Text.Json.Serialization;

namespace SmartEPR.Core.DTOs.SuperAdmin;

public sealed class SuperAdminSchoolCategoryDto
{
    public long SchoolCategoryID { get; init; }
    public string SchoolCategoryName { get; init; } = string.Empty;
}

public sealed class CreateSansthaWithOwnerRequestDto
{
    [JsonPropertyName("sansthaName")]
    public string SansthaName { get; set; } = string.Empty;

    [JsonPropertyName("schoolCategoryID")]
    public long? SchoolCategoryID { get; set; }

    [JsonPropertyName("ownerFirstName")]
    public string OwnerFirstName { get; set; } = string.Empty;

    [JsonPropertyName("ownerMiddleName")]
    public string? OwnerMiddleName { get; set; }

    [JsonPropertyName("ownerLastName")]
    public string OwnerLastName { get; set; } = string.Empty;

    [JsonPropertyName("ownerMobile")]
    public string OwnerMobile { get; set; } = string.Empty;

    [JsonPropertyName("ownerPassword")]
    public string OwnerPassword { get; set; } = string.Empty;
}

public sealed class SansthaOwnerCreatedDto
{
    public long SansthaOrgID { get; init; }
    public string SansthaName { get; init; } = string.Empty;
    public long OwnerUserID { get; init; }
    public string OwnerUserName { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
    public int OwnerUserRoleID { get; init; }
}

public sealed class SansthaOwnerListItemDto
{
    public long SansthaOrgID { get; init; }
    public string SansthaName { get; init; } = string.Empty;
    public long? SrNo { get; init; }
    public bool SansthaIsActive { get; init; }
    public long OwnerUserID { get; init; }
    public string OwnerFirstName { get; init; } = string.Empty;
    public string? OwnerMiddleName { get; init; }
    public string OwnerLastName { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
    public string OwnerUserName { get; init; } = string.Empty;
    public string? OwnerMobile { get; init; }
    public bool OwnerIsActive { get; init; }
    public DateTime? OwnerCreatedAt { get; init; }
}
