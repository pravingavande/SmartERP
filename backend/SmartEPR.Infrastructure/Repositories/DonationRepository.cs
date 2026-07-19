using System.Text.Json;
using Dapper;
using SmartEPR.Core.DTOs.Donation;
using SmartEPR.Core.DTOs.Reports;
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

    public Task<IReadOnlyList<DRHeadOptionDto>> GetDRHeadMasterAsync(long? underOrgId = null, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<DRHeadOptionDto>("dbo.sp_Donation_GetDRHeadMaster", p, cancellationToken);
    }

    public Task<IReadOnlyList<DRHeadMasterDto>> GetDRHeadListAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<DRHeadMasterDto>("dbo.sp_Donation_DRHead_GetList", p, cancellationToken);
    }

    public Task<DRHeadMasterDto?> GetDRHeadByIdAsync(long drHeadId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DRHeadID", drHeadId);
        return _executor.QuerySingleOrDefaultAsync<DRHeadMasterDto>("dbo.sp_Donation_DRHead_GetById", p, cancellationToken);
    }

    public async Task<long> GetNextDRHeadSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextSrNoRow>("dbo.sp_Donation_DRHead_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo ?? 1;
    }

    public async Task<long> SaveDRHeadAsync(SaveDRHeadMasterRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DRHeadID", request.DRHeadID > 0 ? request.DRHeadID : null, dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@SrNo", request.SrNo > 0 ? request.SrNo : null);
        p.Add("@DRHeadName", request.DRHeadName);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_Donation_DRHead_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@DRHeadID");
    }

    public Task DeleteDRHeadAsync(long drHeadId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DRHeadID", drHeadId);
        return _executor.ExecuteAsync("dbo.sp_Donation_DRHead_Delete", p, cancellationToken);
    }

    public async Task<ImportDRHeadResultDto> ImportDRHeadsAsync(
        long destinationUnderOrgId,
        IReadOnlyList<long> drHeadIds,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationUnderOrgID", destinationUnderOrgId);
        p.Add("@DRHeadIdsJson", JsonSerializer.Serialize(drHeadIds));
        p.Add("@ImportedCount", dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.Output);

        var row = await _executor.QuerySingleOrDefaultAsync<ImportDRHeadResultDto>(
            "dbo.sp_Donation_DRHead_Import",
            p,
            cancellationToken).ConfigureAwait(false);

        return row ?? new ImportDRHeadResultDto
        {
            ImportedCount = p.Get<int?>("@ImportedCount") ?? 0,
            SkippedCount = p.Get<int?>("@SkippedCount") ?? 0
        };
    }

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
        p.Add("@BankName", request.BankName);
        p.Add("@LedgerHeadBankID", request.LedgerHeadBankID);
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

    public Task<IReadOnlyList<DonationReportDetailRowDto>> GetReportDetailAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@DRHeadID", filter.DRHeadID);
        p.Add("@PaymentTypeID", filter.PaymentTypeID);
        p.Add("@MinAmount", filter.MinAmount);
        p.Add("@FromDate", filter.FromDate?.Date);
        p.Add("@ToDate", filter.ToDate?.Date);
        return _executor.QueryListAsync<DonationReportDetailRowDto>("dbo.sp_Donation_GetReportDetail", p, cancellationToken);
    }

    public Task<IReadOnlyList<DonationReportUserSummaryRowDto>> GetReportUserSummaryAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@FromDate", filter.FromDate?.Date);
        p.Add("@ToDate", filter.ToDate?.Date);
        return _executor.QueryListAsync<DonationReportUserSummaryRowDto>("dbo.sp_Donation_GetReportUserSummary", p, cancellationToken);
    }

    private sealed class NextNoRow
    {
        public long NextReceiptNo { get; init; }
    }

    private sealed class OrgNextNoRow
    {
        public long NextOrgReceiptNo { get; init; }
    }

    private sealed class NextSrNoRow
    {
        public long NextSrNo { get; init; }
    }
}
