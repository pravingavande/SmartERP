using System.Text.Json.Serialization;
using SmartEPR.Core.DTOs.Audit;

namespace SmartEPR.Core.DTOs.IoRegister;

public sealed class YearIoOptionDto
{
    public long YIOID { get; init; }
    public string YearName { get; init; } = string.Empty;
    public string? YearLabel { get; init; }
    public bool IsActive { get; init; }
}

public sealed class IoLookupsDto
{
    public IReadOnlyList<OrgOptionDto> Orgs { get; init; } = [];
    public IReadOnlyList<YearIoOptionDto> Years { get; init; } = [];
    public YearIoOptionDto? ActiveYear { get; init; }
}

public sealed class NextRecordNoDto
{
    public int NextRecordNo { get; init; }
    public long YIOID { get; init; }
}

public sealed class InwardRegisterDto
{
    public long IRID { get; init; }
    public long OrgID { get; init; }
    public int RecordNo { get; init; }
    public DateTime IRDate { get; init; }
    public string? FileNo { get; init; }
    public string? LetterNo { get; init; }
    public string FromWhomReceived { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public string? ToWhomIssued { get; init; }
    public string? Remark { get; init; }
    public string? AttachmentPath { get; init; }
    public long YIOID { get; init; }
    public string? OrganizationName { get; init; }
    public string? YearName { get; init; }
}

public sealed class OutwardRegisterDto
{
    public long ORID { get; init; }
    public long OrgID { get; init; }
    public int RecordNo { get; init; }
    public DateTime ORDate { get; init; }
    public string? Enclosures { get; init; }
    public string Address { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public string? FileNo { get; init; }
    public DateTime? ORRDate { get; init; }
    public decimal ExpensesAmt { get; init; }
    public string? Remark { get; init; }
    public string? AttachmentPath { get; init; }
    public long YIOID { get; init; }
    public string? OrganizationName { get; init; }
    public string? YearName { get; init; }
}

public sealed class InwardListFilterDto
{
    public long OrgID { get; set; }
    public long? YIOID { get; set; }
    public int? RecordNo { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? FileNo { get; set; }
    public string? LetterNo { get; set; }
    public string? Subject { get; set; }
    public string? FromWhomReceived { get; set; }
    public string? Search { get; set; }
}

public sealed class OutwardListFilterDto
{
    public long OrgID { get; set; }
    public long? YIOID { get; set; }
    public int? RecordNo { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? FileNo { get; set; }
    public string? Subject { get; set; }
    public string? Address { get; set; }
    public string? Search { get; set; }
}

public sealed class SaveInwardRequestDto
{
    [JsonPropertyName("irid")]
    public long IRID { get; set; }

    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("irDate")]
    public DateTime IRDate { get; set; }

    [JsonPropertyName("fileNo")]
    public string? FileNo { get; set; }

    [JsonPropertyName("letterNo")]
    public string? LetterNo { get; set; }

    [JsonPropertyName("fromWhomReceived")]
    public string FromWhomReceived { get; set; } = string.Empty;

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    [JsonPropertyName("toWhomIssued")]
    public string? ToWhomIssued { get; set; }

    [JsonPropertyName("remark")]
    public string? Remark { get; set; }

    [JsonPropertyName("attachmentPath")]
    public string? AttachmentPath { get; set; }
}

public sealed class SaveOutwardRequestDto
{
    [JsonPropertyName("orid")]
    public long ORID { get; set; }

    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("orDate")]
    public DateTime ORDate { get; set; }

    [JsonPropertyName("enclosures")]
    public string? Enclosures { get; set; }

    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    [JsonPropertyName("fileNo")]
    public string? FileNo { get; set; }

    [JsonPropertyName("orrDate")]
    public DateTime? ORRDate { get; set; }

    [JsonPropertyName("expensesAmt")]
    public decimal ExpensesAmt { get; set; }

    [JsonPropertyName("remark")]
    public string? Remark { get; set; }

    [JsonPropertyName("attachmentPath")]
    public string? AttachmentPath { get; set; }
}
