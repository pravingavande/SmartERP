using SmartEPR.Core.DTOs.Dashboard;
using SmartEPR.Core.DTOs.DocumentUpload;

namespace SmartEPR.Core.Interfaces;

public interface IDocumentUploadService
{
    Task<IReadOnlyList<DocumentUploadDto>> GetListAsync(long orgId, CancellationToken cancellationToken = default);
    Task<DocumentUploadDto?> GetByIdAsync(long documentUploadId, CancellationToken cancellationToken = default);
    Task<long> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<(DocumentUploadDto? Data, string? Error)> SaveAsync(SaveDocumentUploadRequestDto request, long userId, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteAsync(long documentUploadId, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DashboardDocumentItemDto>> GetDashboardDocumentsAsync(long userId, int topCount = 20, CancellationToken cancellationToken = default);
    Task<bool> CanUserAccessFileAsync(long userId, string relativePath, CancellationToken cancellationToken = default);
}
