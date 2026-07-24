namespace SmartEPR.Core.DTOs.Dashboard;

public sealed class DashboardDocumentItemDto
{
    public long DocumentUploadID { get; init; }
    public string DocumentTitle { get; init; } = string.Empty;
    public DateTime CreatedDate { get; init; }
    public string? DocumentPath { get; init; }
    public string? OrganizationName { get; init; }
}
