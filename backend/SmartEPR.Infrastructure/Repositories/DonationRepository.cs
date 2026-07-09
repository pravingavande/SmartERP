using System.Text.Json;
using Dapper;
using SmartEPR.Core.DTOs.Donation;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class DonationRepository : IDonationRepository
{
    private readonly StoredProcedureExecutor _executor;

    public DonationRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadsAsync(long? orgId = null, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<DRHeadOptionDto>("dbo.sp_Donation_GetDRHeads", p, cancellationToken);
    }

    public Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadMasterAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<DRHeadOptionDto>("dbo.sp_Donation_GetDRHeadMaster", null, cancellationToken);

    public Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadDefineByOrgAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<DRHeadOptionDto>("dbo.sp_Donation_DRHeadDefine_GetByOrg", p, cancellationToken);
    }

    public Task SaveDRHeadDefineAsync(long orgId, IReadOnlyList<long> drHeadIds, CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(drHeadIds);
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@DRHeadIdsJson", json);
        return _executor.ExecuteAsync("dbo.sp_Donation_DRHeadDefine_Save", p, cancellationToken);
    }

    public async Task<long> GetNextReceiptNoAsync(long fyId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@FyID", fyId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextNoRow>("dbo.sp_Donation_GetNextReceiptNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextReceiptNo ?? 1;
    }

    public async Task<long> GetNextOrgReceiptNoAsync(long orgId, long fyId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@FyID", fyId);
        var row = await _executor.QuerySingleOrDefaultAsync<OrgNextNoRow>("dbo.sp_Donation_GetNextOrgReceiptNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextOrgReceiptNo ?? 1;
    }

    public Task<IReadOnlyList<DonationListItemDto>> GetListAsync(long? orgId, long? fyId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@FyID", fyId);
        return _executor.QueryListAsync<DonationListItemDto>("dbo.sp_Donation_GetList", p, cancellationToken);
    }

    public Task<DonationListItemDto?> GetByIdAsync(long drId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DRID", drId);
        return _executor.QuerySingleOrDefaultAsync<DonationListItemDto>("dbo.sp_Donation_GetById", p, cancellationToken);
    }

    public async Task<long> SaveAsync(long userId, SaveDonationRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DRID", request.DrID > 0 ? request.DrID : null, dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@ReceiptNo", request.ReceiptNo);
        p.Add("@ReceiptDate", request.ReceiptDate);
        p.Add("@DRHeadID", request.DRHeadID);
        p.Add("@DonorName", request.DonorName);
        p.Add("@Address", request.Address);
        p.Add("@PanNo", request.PanNo);
        p.Add("@AadharNo", request.AadharNo);
        p.Add("@MobileNo", request.MobileNo);
        p.Add("@Amount", request.Amount);
        p.Add("@PaymentTypeID", request.PaymentTypeID);
        p.Add("@TransactionNo", request.TransactionNo);
        p.Add("@TransactionDate", request.TransactionDate);
        p.Add("@DepositDate", request.DepositDate);
        p.Add("@Remark", request.Remark);
        p.Add("@UserID", userId);
        p.Add("@FyID", request.FyID);
        p.Add("@OrgID", request.OrgID);
        p.Add("@OrgIDReceiptNo", request.OrgIDReceiptNo);

        await _executor.ExecuteAsync("dbo.sp_Donation_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@DRID");
    }

    public Task DeleteAsync(long drId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DRID", drId);
        return _executor.ExecuteAsync("dbo.sp_Donation_Delete", p, cancellationToken);
    }

    private sealed class NextNoRow
    {
        public long NextReceiptNo { get; init; }
    }

    private sealed class OrgNextNoRow
    {
        public long NextOrgReceiptNo { get; init; }
    }
}
