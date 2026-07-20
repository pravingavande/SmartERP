using System.Text.Json.Serialization;
using SmartEPR.Core.DTOs.Audit;

namespace SmartEPR.Core.DTOs.Master;

public sealed class ClassMasterDto
{
    public long ClassID { get; init; }
    public long OrgID { get; init; }
    public long SrNo { get; init; }
    public string ClassName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public string? OrganizationName { get; init; }
}

public sealed class SaveClassRequestDto
{
    [JsonPropertyName("classID")]
    public long ClassID { get; set; }

    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("srNo")]
    public long SrNo { get; set; }

    [JsonPropertyName("className")]
    public string ClassName { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
}

public sealed class ImportClassRequestDto
{
    [JsonPropertyName("destinationOrgID")]
    public long DestinationOrgID { get; set; }

    [JsonPropertyName("classIds")]
    public IReadOnlyList<long> ClassIds { get; set; } = [];
}

public sealed class ImportClassResultDto
{
    public int ImportedCount { get; init; }
    public int SkippedCount { get; init; }
}

public sealed class ImportItemGroupRequestDto
{
    [JsonPropertyName("destinationOrgID")]
    public long DestinationOrgID { get; set; }

    [JsonPropertyName("itemGroupIds")]
    public IReadOnlyList<long> ItemGroupIds { get; set; } = [];
}

public sealed class ImportItemRequestDto
{
    [JsonPropertyName("destinationOrgID")]
    public long DestinationOrgID { get; set; }

    [JsonPropertyName("itemIds")]
    public IReadOnlyList<long> ItemIds { get; set; } = [];
}

public sealed class SubjectMasterDto
{
    public long SubjectID { get; init; }
    public string SubjectName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public sealed class SaveSubjectRequestDto
{
    [JsonPropertyName("subjectID")]
    public long SubjectID { get; set; }

    [JsonPropertyName("subjectName")]
    public string SubjectName { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
}

public sealed class MasterOptionDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class ItemGroupOptionDto
{
    public long ItemGroupID { get; init; }
    public string ItemGroupName { get; init; } = string.Empty;
    public int SrNo { get; init; }
}

public sealed class ItemOptionDto
{
    public long ItemID { get; init; }
    public string ItemName { get; init; } = string.Empty;
    public decimal Rate { get; init; }
    public long ItemGroupID { get; init; }
}

public sealed class WeekOptionDto
{
    public long WeekID { get; init; }
    public string WeekName { get; init; } = string.Empty;
}

public sealed class AyMasterOptionDto
{
    public long AyID { get; init; }
    public string AyName { get; init; } = string.Empty;
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
}

public sealed class AcademicScheduleLookupsDto
{
    /// <summary>School orgs — same source as Teacher Master (sp_Audit_GetUserOrgs).</summary>
    public IReadOnlyList<OrgOptionDto> Orgs { get; init; } = [];
    public IReadOnlyList<MasterOptionDto> Classes { get; init; } = [];
    public IReadOnlyList<MasterOptionDto> Subjects { get; init; } = [];
    public IReadOnlyList<WeekOptionDto> Weeks { get; init; } = [];
    public IReadOnlyList<AyMasterOptionDto> AyList { get; init; } = [];
}

public sealed class AcademicScheduleDto
{
    public long ASID { get; init; }
    public long UnderOrgID { get; init; }
    public int TMonth { get; init; }
    public long ClassID { get; init; }
    public long SubjectID { get; init; }
    public int SrNo { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public long WeekID { get; init; }
    public string? FileAttachment { get; init; }
    public long AyID { get; init; }
    public string? OrganizationName { get; init; }
    public string? ClassName { get; init; }
    public string? SubjectName { get; init; }
    public string? WeekName { get; init; }
    public string? AyName { get; init; }
}

public sealed class SaveAcademicScheduleRequestDto
{
    [JsonPropertyName("asid")]
    public long ASID { get; set; }

    [JsonPropertyName("underOrgID")]
    public long UnderOrgID { get; set; }

    [JsonPropertyName("tMonth")]
    public int TMonth { get; set; }

    [JsonPropertyName("classID")]
    public long ClassID { get; set; }

    [JsonPropertyName("subjectID")]
    public long SubjectID { get; set; }

    [JsonPropertyName("srNo")]
    public int SrNo { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("weekID")]
    public long WeekID { get; set; }

    [JsonPropertyName("fileAttachment")]
    public string? FileAttachment { get; set; }

    [JsonPropertyName("ayID")]
    public long AyID { get; set; }
}

public sealed class AcademicScheduleListFilterDto
{
    public long? UnderOrgID { get; init; }
    public long? ClassID { get; init; }
    public long? SubjectID { get; init; }
    public int? TMonth { get; init; }
    public long? WeekID { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public long? AyID { get; init; }
    public string? Search { get; init; }
}

public sealed class ItemGroupMasterDto
{
    public long ItemGroupID { get; init; }
    public long OrgID { get; init; }
    public int SrNo { get; init; }
    public string ItemGroupName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public string? OrganizationName { get; init; }
}

public sealed class SaveItemGroupRequestDto
{
    [JsonPropertyName("itemGroupID")]
    public long ItemGroupID { get; set; }

    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("itemGroupName")]
    public string ItemGroupName { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
}

public sealed class ItemMasterDto
{
    public long ItemID { get; init; }
    public long OrgID { get; init; }
    public long ItemGroupID { get; init; }
    public string ItemName { get; init; } = string.Empty;
    public decimal Rate { get; init; }
    public bool IsActive { get; init; }
    public string? OrganizationName { get; init; }
    public string? ItemGroupName { get; init; }
}

public sealed class SaveItemRequestDto
{
    [JsonPropertyName("itemID")]
    public long ItemID { get; set; }

    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("itemGroupID")]
    public long ItemGroupID { get; set; }

    [JsonPropertyName("itemName")]
    public string ItemName { get; set; } = string.Empty;

    [JsonPropertyName("rate")]
    public decimal Rate { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
}

public sealed class StockRegisterDto
{
    public long StockID { get; init; }
    public long OrgID { get; init; }
    public long ItemID { get; init; }
    public decimal Qty { get; init; }
    public decimal Rate { get; init; }
    public decimal Amount { get; init; }
    public string? Remark { get; init; }
    public string? OrganizationName { get; init; }
    public string? ItemName { get; init; }
}

public sealed class SaveStockRequestDto
{
    [JsonPropertyName("stockID")]
    public long StockID { get; set; }

    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("itemID")]
    public long ItemID { get; set; }

    [JsonPropertyName("qty")]
    public decimal Qty { get; set; }

    [JsonPropertyName("rate")]
    public decimal Rate { get; set; }

    [JsonPropertyName("remark")]
    public string? Remark { get; set; }
}

public sealed class NextSrNoDto
{
    public int NextSrNo { get; init; }
}

public sealed class CurrentAyDto
{
    public long AyID { get; init; }
}

public sealed class InventoryLookupsDto
{
    public IReadOnlyList<OrgOptionDto> Orgs { get; init; } = [];
}
