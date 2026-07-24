using System.Data;
using Dapper;
using SmartEPR.Core.DTOs.Dashboard;
using SmartEPR.Core.DTOs.DocumentUpload;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class DocumentUploadRepository : IDocumentUploadRepository
{
    private readonly StoredProcedureExecutor _executor;

    public DocumentUploadRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<DocumentUploadDto>> GetListAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<DocumentUploadDto>("dbo.sp_DocumentUpload_GetList", p, cancellationToken);
    }

    public Task<DocumentUploadDto?> GetByIdAsync(long documentUploadId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DocumentUploadID", documentUploadId);
        return _executor.QuerySingleOrDefaultAsync<DocumentUploadDto>("dbo.sp_DocumentUpload_GetById", p, cancellationToken);
    }

    public async Task<long> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextSrNoDto>("dbo.sp_DocumentUpload_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo ?? 1;
    }

    public async Task<long> SaveAsync(SaveDocumentUploadRequestDto request, long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DocumentUploadID", request.DocumentUploadID > 0 ? request.DocumentUploadID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@SrNo", request.SrNo > 0 ? request.SrNo : null);
        p.Add("@TDate", request.TDate?.Date);
        p.Add("@DocumentTitle", request.DocumentTitle);
        p.Add("@DocumentPath", request.DocumentPath);
        p.Add("@UserID", userId);
        await _executor.ExecuteAsync("dbo.sp_DocumentUpload_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@DocumentUploadID");
    }

    public Task DeleteAsync(long documentUploadId, long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DocumentUploadID", documentUploadId);
        p.Add("@UserID", userId);
        return _executor.ExecuteAsync("dbo.sp_DocumentUpload_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<DashboardDocumentItemDto>> GetDashboardDocumentsAsync(long userId, int topCount, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        p.Add("@TopCount", topCount);
        return _executor.QueryListAsync<DashboardDocumentItemDto>("dbo.sp_DocumentUpload_GetDashboardDocuments", p, cancellationToken);
    }

    public async Task<bool> CanUserAccessFileAsync(long userId, string relativePath, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        p.Add("@DocumentPath", relativePath);
        var row = await _executor.QuerySingleOrDefaultAsync<CanAccessRow>("dbo.sp_DocumentUpload_CanUserAccessFile", p, cancellationToken).ConfigureAwait(false);
        return row?.CanAccess ?? false;
    }

    private sealed class CanAccessRow
    {
        public bool CanAccess { get; init; }
    }
}
