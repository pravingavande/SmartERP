using System.Data;
using System.Text.Json;
using Dapper;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class AuditVoucherRepository : IAuditVoucherRepository
{
    private readonly StoredProcedureExecutor _executor;
    private readonly SqlConnectionFactory _connectionFactory;

    public AuditVoucherRepository(StoredProcedureExecutor executor, SqlConnectionFactory connectionFactory)
    {
        _executor = executor;
        _connectionFactory = connectionFactory;
    }

    public Task<IReadOnlyList<OrgOptionDto>> GetUserOrgsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        return _executor.QueryListAsync<OrgOptionDto>("dbo.sp_Audit_GetUserOrgs", p, cancellationToken);
    }

    public Task<IReadOnlyList<OrgOptionDto>> GetSansthaOrgsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        return _executor.QueryListAsync<OrgOptionDto>("dbo.sp_Audit_GetSansthaOrgs", p, cancellationToken);
    }

    public Task<IReadOnlyList<AccountRegisterOptionDto>> GetAccountRegistersAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<AccountRegisterOptionDto>("dbo.sp_Audit_GetAccountRegisters", p, cancellationToken);
    }

    public Task<IReadOnlyList<PartyOptionDto>> GetPartiesAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<PartyOptionDto>("dbo.sp_Audit_GetParties", p, cancellationToken);
    }

    public Task<IReadOnlyList<PaymentTypeOptionDto>> GetPaymentTypesAsync(CancellationToken cancellationToken = default)
    {
        return _executor.QueryListAsync<PaymentTypeOptionDto>("dbo.sp_Audit_GetPaymentTypes", null, cancellationToken);
    }

    public Task<IReadOnlyList<FyOptionDto>> GetFyListAsync(CancellationToken cancellationToken = default)
    {
        return _executor.QueryListAsync<FyOptionDto>("dbo.sp_Audit_GetFyList", null, cancellationToken);
    }

    public Task<IReadOnlyList<LedgerHeadOptionDto>> GetLedgerHeadsAsync(CancellationToken cancellationToken = default)
    {
        return _executor.QueryListAsync<LedgerHeadOptionDto>("dbo.sp_Audit_GetLedgerHeads", null, cancellationToken);
    }

    public Task<IReadOnlyList<LedgerHeadOptionDto>> GetBankLedgerHeadsAsync(CancellationToken cancellationToken = default)
    {
        return _executor.QueryListAsync<LedgerHeadOptionDto>("dbo.sp_Audit_GetBankLedgerHeads", null, cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetLedgerNarrationsAsync(long ledgerHeadId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LedgerHeadID", ledgerHeadId);
        var rows = await _executor.QueryListAsync<NarrationRow>("dbo.sp_Audit_GetLedgerNarrations", p, cancellationToken).ConfigureAwait(false);
        return rows.Select(r => r.LedgerHeadNarration).Where(n => !string.IsNullOrWhiteSpace(n)).ToList();
    }

    public Task SaveLedgerNarrationAsync(long ledgerHeadId, string narration, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LedgerHeadID", ledgerHeadId);
        p.Add("@LedgerHeadNarration", narration);
        return _executor.ExecuteAsync("dbo.sp_Audit_SaveLedgerNarration", p, cancellationToken);
    }

    public async Task<long> GetNextVCodeAsync(long orgId, long accountRegisterId, long fyId, string vType, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@AccountRegisterID", accountRegisterId);
        p.Add("@FyID", fyId);
        p.Add("@VType", vType);
        var row = await _executor.QuerySingleOrDefaultAsync<NextVCodeRow>("dbo.sp_Audit_GetNextVCode", p, cancellationToken).ConfigureAwait(false);
        return row?.NextVCode ?? 1;
    }

    public Task<IReadOnlyList<VoucherListItemDto>> GetVoucherListAsync(long orgId, string vType, long? fyId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@VType", vType);
        p.Add("@FyID", fyId);
        return _executor.QueryListAsync<VoucherListItemDto>("dbo.sp_Audit_Voucher_GetList", p, cancellationToken);
    }

    public async Task<VoucherDto?> GetVoucherByIdAsync(long voucherId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@VoucherID", voucherId);
        var header = await _executor.QuerySingleOrDefaultAsync<VoucherDto>("dbo.sp_Audit_Voucher_GetById", p, cancellationToken).ConfigureAwait(false);
        if (header is null) return null;

        var details = await _executor.QueryListAsync<VoucherDetailDto>("dbo.sp_Audit_Voucher_GetDetails", p, cancellationToken).ConfigureAwait(false);
        return new VoucherDto
        {
            VoucherID = header.VoucherID,
            OrgID = header.OrgID,
            AccountRegisterID = header.AccountRegisterID,
            VType = header.VType,
            VCode = header.VCode,
            VDate = header.VDate,
            PartyTID = header.PartyTID,
            TotalAmount = header.TotalAmount,
            Remark = header.Remark,
            PaymentTypeID = header.PaymentTypeID,
            TransactionNo = header.TransactionNo,
            TransactionDate = header.TransactionDate,
            DepositDate = header.DepositDate,
            LedgerHeadBankID = header.LedgerHeadBankID,
            BankName = header.BankName,
            FilePath = header.FilePath,
            UserID = header.UserID,
            FyID = header.FyID,
            OrganizationName = header.OrganizationName,
            AccountRegister = header.AccountRegister,
            PartyName = header.PartyName,
            PaymentType = header.PaymentType,
            FyName = header.FyName,
            Details = details
        };
    }

    public async Task<long> SaveVoucherAsync(long userId, SaveVoucherRequestDto request, CancellationToken cancellationToken = default)
    {
        foreach (var line in request.Details)
        {
            if (!string.IsNullOrWhiteSpace(line.LedgerHeadNarration))
            {
                await SaveLedgerNarrationAsync(line.LedgerHeadId, line.LedgerHeadNarration.Trim(), cancellationToken).ConfigureAwait(false);
            }
        }

        var detailsJson = JsonSerializer.Serialize(request.Details, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        var p = new DynamicParameters();
        p.Add("@VoucherID", request.VoucherID > 0 ? request.VoucherID : null, dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@AccountRegisterID", request.AccountRegisterID);
        p.Add("@VType", request.VType);
        p.Add("@VCode", request.VCode);
        p.Add("@VDate", request.VDate);
        p.Add("@PartyTID", request.PartyTID);
        p.Add("@Remark", request.Remark);
        p.Add("@PaymentTypeID", request.PaymentTypeID);
        p.Add("@TransactionNo", request.TransactionNo);
        p.Add("@TransactionDate", request.TransactionDate);
        p.Add("@DepositDate", request.DepositDate);
        p.Add("@LedgerHeadBankID", request.LedgerHeadBankID);
        p.Add("@BankName", request.BankName);
        p.Add("@FilePath", request.FilePath);
        p.Add("@UserID", userId);
        p.Add("@FyID", request.FyID);
        p.Add("@DetailsJson", detailsJson);

        await _executor.ExecuteAsync("dbo.sp_Audit_Voucher_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@VoucherID");
    }

    public Task DeleteVoucherAsync(long voucherId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@VoucherID", voucherId);
        return _executor.ExecuteAsync("dbo.sp_Audit_Voucher_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<AuditDashboardRowDto>> GetDashboardAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        return _executor.QueryListAsync<AuditDashboardRowDto>("dbo.sp_Audit_GetDashboard", p, cancellationToken);
    }

    public async Task<AuditDashboardSummaryDto> GetDashboardSummaryAsync(long userId, long? fyId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        p.Add("@FyID", fyId);
        var row = await _executor.QuerySingleOrDefaultAsync<AuditDashboardSummaryDto>("dbo.sp_Audit_GetDashboardSummary", p, cancellationToken).ConfigureAwait(false);
        return row ?? new AuditDashboardSummaryDto();
    }

    public async Task<(IReadOnlyList<AuditCashSummaryVoucherRowDto> VoucherRows, IReadOnlyList<AuditCashSummaryAvailableRowDto> AvailableCashRows)> GetCashSummaryAsync(
        long userId,
        long? fyId,
        long? orgId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        p.Add("@FyID", fyId);
        p.Add("@OrgID", orgId);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_Audit_GetCashSummary",
                p,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var voucherRows = (await multi.ReadAsync<AuditCashSummaryVoucherRowDto>().ConfigureAwait(false)).AsList();
        var availableRows = (await multi.ReadAsync<AuditCashSummaryAvailableRowDto>().ConfigureAwait(false)).AsList();
        return (voucherRows, availableRows);
    }

    public Task<IReadOnlyList<AccountRegisterMasterOptionDto>> GetAccountRegisterMasterAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<AccountRegisterMasterOptionDto>("dbo.sp_Audit_GetAccountRegisterMaster", null, cancellationToken);

    public Task<IReadOnlyList<AccountRegisterMasterOptionDto>> GetAccountRegisterDefineByOrgAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<AccountRegisterMasterOptionDto>("dbo.sp_Audit_AccountRegisterDefine_GetByOrg", p, cancellationToken);
    }

    public Task SaveAccountRegisterDefineAsync(long orgId, IReadOnlyList<long> accountRegisterIds, CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(accountRegisterIds);
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@AccountRegisterIdsJson", json);
        return _executor.ExecuteAsync("dbo.sp_Audit_AccountRegisterDefine_Save", p, cancellationToken);
    }

    public Task<IReadOnlyList<PartyMasterDto>> GetPartyListAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<PartyMasterDto>("dbo.sp_Audit_Party_GetList", p, cancellationToken);
    }

    public async Task<PartyMasterDto?> GetPartyByIdAsync(long partyId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@PartyID", partyId);
        return await _executor.QuerySingleOrDefaultAsync<PartyMasterDto>("dbo.sp_Audit_Party_GetById", p, cancellationToken).ConfigureAwait(false);
    }

    public async Task<long> SavePartyAsync(SavePartyRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@PartyID", request.PartyID > 0 ? request.PartyID : null, dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@PartyName", request.PartyName);
        p.Add("@Address", request.Address);
        p.Add("@MobNo", request.MobNo);
        p.Add("@PanNo", request.PanNo);
        p.Add("@GSTNo", request.GSTNo);
        p.Add("@IsActive", request.IsActive);

        await _executor.ExecuteAsync("dbo.sp_Audit_Party_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@PartyID");
    }

    public Task<IReadOnlyList<LedgerTypeOptionDto>> GetLedgerTypesAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<LedgerTypeOptionDto>("dbo.sp_Audit_GetLedgerTypes", null, cancellationToken);

    public Task<IReadOnlyList<LedgerHeadMasterDto>> GetLedgerHeadListAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<LedgerHeadMasterDto>("dbo.sp_Audit_LedgerHead_GetList", p, cancellationToken);
    }

    public Task<LedgerHeadMasterDto?> GetLedgerHeadByIdAsync(long ledgerHeadId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LedgerHeadID", ledgerHeadId);
        return _executor.QuerySingleOrDefaultAsync<LedgerHeadMasterDto>("dbo.sp_Audit_LedgerHead_GetById", p, cancellationToken);
    }

    public async Task<long> GetNextLedgerHeadSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextSrNoRow>("dbo.sp_Audit_LedgerHead_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo ?? 1;
    }

    public async Task<long> SaveLedgerHeadAsync(SaveLedgerHeadRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LedgerHeadID", request.LedgerHeadID > 0 ? request.LedgerHeadID : null, dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@LedgerHead", request.LedgerHead);
        p.Add("@LedgerHeadShort", request.LedgerHeadShort);
        p.Add("@LedgerTypeID", request.LedgerTypeID);
        p.Add("@IsActive", request.IsActive);

        await _executor.ExecuteAsync("dbo.sp_Audit_LedgerHead_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@LedgerHeadID");
    }

    private sealed class NarrationRow
    {
        public string LedgerHeadNarration { get; init; } = string.Empty;
    }

    private sealed class NextVCodeRow
    {
        public long NextVCode { get; init; }
    }

    private sealed class NextSrNoRow
    {
        public long NextSrNo { get; init; }
    }
}
