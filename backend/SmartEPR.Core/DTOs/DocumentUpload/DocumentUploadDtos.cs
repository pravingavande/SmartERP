namespace SmartEPR.Core.DTOs.DocumentUpload;

public sealed class DocumentUploadDto
{
    public long DocumentUploadID { get; init; }
    public long OrgID { get; init; }
    public long? UnderOrgID { get; init; }
    public long? SrNo { get; init; }
    public DateTime? TDate { get; init; }
    public string DocumentTitle { get; init; } = string.Empty;
    public string? DocumentPath { get; init; }
    public DateTime? CreatedDate { get; init; }
    public DateTime? ModifiedDate { get; init; }
    public long? CreatedUserID { get; init; }
    public long? ModifiedUserID { get; init; }
    public string? OrganizationName { get; init; }
}

public sealed class SaveDocumentUploadRequestDto
{
    public long DocumentUploadID { get; set; }
    public long OrgID { get; set; }
    public long? UnderOrgID { get; set; }
    public long? SrNo { get; set; }
    public DateTime? TDate { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string? DocumentPath { get; set; }
}
