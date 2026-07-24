using SmartEPR.Core.DTOs.Dashboard;
using SmartEPR.Core.DTOs.DocumentUpload;

namespace SmartEPR.Core.Interfaces;

public interface IDocumentUploadRepository
{
    Task<IReadOnlyList<DocumentUploadDto>> GetListAsync(long orgId, CancellationToken cancellationToken = default);
    Task<DocumentUploadDto?> GetByIdAsync(long documentUploadId, CancellationToken cancellationToken = default);
    Task<long> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(SaveDocumentUploadRequestDto request, long userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(long documentUploadId, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DashboardDocumentItemDto>> GetDashboardDocumentsAsync(long userId, int topCount, CancellationToken cancellationToken = default);
    Task<bool> CanUserAccessFileAsync(long userId, string relativePath, CancellationToken cancellationToken = default);
}
