using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Dashboard;
using SmartEPR.Core.DTOs.DocumentUpload;
using SmartEPR.Core.Interfaces;
using SmartEPR.Core.Validation;

namespace SmartEPR.Infrastructure.Services;

public sealed class DocumentUploadService : IDocumentUploadService
{
    private readonly IDocumentUploadRepository _repository;

    public DocumentUploadService(IDocumentUploadRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<DocumentUploadDto>> GetListAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetListAsync(orgId, cancellationToken);

    public Task<DocumentUploadDto?> GetByIdAsync(long documentUploadId, CancellationToken cancellationToken = default)
        => _repository.GetByIdAsync(documentUploadId, cancellationToken);

    public Task<long> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetNextSrNoAsync(orgId, cancellationToken);

    public async Task<(DocumentUploadDto? Data, string? Error)> SaveAsync(
        SaveDocumentUploadRequestDto request,
        long userId,
        CancellationToken cancellationToken = default)
    {
        request.DocumentTitle = MasterValidators.Trim(request.DocumentTitle);
        request.DocumentPath = string.IsNullOrWhiteSpace(request.DocumentPath) ? null : request.DocumentPath.Trim();

        var error = MasterValidators.FirstError(
            MasterValidators.RequirePositiveId(request.OrgID, "Organization"),
            MasterValidators.RequirePositiveId(request.SrNo, "Sr No"),
            MasterValidators.RequireText(request.DocumentTitle, "Document title"));
        if (error is not null) return (null, error);

        if (request.TDate is null)
            return (null, "Date is required.");

        if (request.DocumentUploadID <= 0 && string.IsNullOrWhiteSpace(request.DocumentPath))
            return (null, "Document file is required.");

        try
        {
            var id = await _repository.SaveAsync(request, userId, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null ? (null, "Unable to save document upload.") : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(long documentUploadId, long userId, CancellationToken cancellationToken = default)
    {
        if (documentUploadId <= 0) return (false, "Document is required.");
        try
        {
            await _repository.DeleteAsync(documentUploadId, userId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public Task<IReadOnlyList<DashboardDocumentItemDto>> GetDashboardDocumentsAsync(long userId, int topCount = 20, CancellationToken cancellationToken = default)
    {
        var safeCount = topCount is < 1 or > 50 ? 20 : topCount;
        return _repository.GetDashboardDocumentsAsync(userId, safeCount, cancellationToken);
    }

    public Task<bool> CanUserAccessFileAsync(long userId, string relativePath, CancellationToken cancellationToken = default)
        => _repository.CanUserAccessFileAsync(userId, relativePath, cancellationToken);
}
