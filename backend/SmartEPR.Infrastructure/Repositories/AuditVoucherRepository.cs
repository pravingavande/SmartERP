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

    public Task<IReadOnlyList<LedgerHeadOptionDto>> GetLedgerHeadsAsync(long? orgId = null, string? vType = null, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@VType", string.IsNullOrWhiteSpace(vType) ? null : vType.Trim());
        return _executor.QueryListAsync<LedgerHeadOptionDto>("dbo.sp_Audit_GetLedgerHeads", p, cancellationToken);
    }

    public Task<IReadOnlyList<LedgerHeadOptionDto>> GetBankLedgerHeadsAsync(long? orgId = null, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<LedgerHeadOptionDto>("dbo.sp_Audit_GetBankLedgerHeads", p, cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetLedgerNarrationsAsync(
        long orgId,
        long ledgerHeadId,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LedgerHeadID", ledgerHeadId);
        p.Add("@OrgID", orgId);
        p.Add("@Search", string.IsNullOrWhiteSpace(search) ? null : search.Trim());
        var rows = await _executor.QueryListAsync<NarrationRow>("dbo.sp_Audit_GetLedgerNarrations", p, cancellationToken).ConfigureAwait(false);
        return rows.Select(r => r.LedgerHeadNarration).Where(n => !string.IsNullOrWhiteSpace(n)).ToList();
    }

    public Task SaveLedgerNarrationAsync(long orgId, long ledgerHeadId, string narration, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LedgerHeadID", ledgerHeadId);
        p.Add("@OrgID", orgId);
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
            CreatedDate = header.CreatedDate,
            ModifiedDate = header.ModifiedDate,
            CreatedUserID = header.CreatedUserID,
            ModifiedUserID = header.ModifiedUserID,
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
                await SaveLedgerNarrationAsync(request.OrgID, line.LedgerHeadId, line.LedgerHeadNarration.Trim(), cancellationToken).ConfigureAwait(false);
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

    public Task<IReadOnlyList<AccountRegisterMasterOptionDto>> GetAccountRegisterMasterAsync(long? underOrgId = null, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<AccountRegisterMasterOptionDto>("dbo.sp_Audit_GetAccountRegisterMaster", p, cancellationToken);
    }

    public Task<IReadOnlyList<AccountRegisterMasterDto>> GetAccountRegisterListAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<AccountRegisterMasterDto>("dbo.sp_Audit_AccountRegister_GetList", p, cancellationToken);
    }

    public Task<AccountRegisterMasterDto?> GetAccountRegisterByIdAsync(long accountRegisterId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@AccountRegisterID", accountRegisterId);
        return _executor.QuerySingleOrDefaultAsync<AccountRegisterMasterDto>("dbo.sp_Audit_AccountRegister_GetById", p, cancellationToken);
    }

    public async Task<long> GetNextAccountRegisterSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextSrNoRow>("dbo.sp_Audit_AccountRegister_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo ?? 1;
    }

    public async Task<long> SaveAccountRegisterAsync(SaveAccountRegisterMasterRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@AccountRegisterID", request.AccountRegisterID > 0 ? request.AccountRegisterID : null, dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@SrNo", request.SrNo > 0 ? request.SrNo : null);
        p.Add("@AccountRegister", request.AccountRegister);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_Audit_AccountRegister_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@AccountRegisterID");
    }

    public Task DeleteAccountRegisterAsync(long accountRegisterId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@AccountRegisterID", accountRegisterId);
        return _executor.ExecuteAsync("dbo.sp_Audit_AccountRegister_Delete", p, cancellationToken);
    }

    public async Task<ImportAccountRegisterResultDto> ImportAccountRegistersAsync(
        long destinationUnderOrgId,
        IReadOnlyList<long> accountRegisterIds,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationUnderOrgID", destinationUnderOrgId);
        p.Add("@AccountRegisterIdsJson", JsonSerializer.Serialize(accountRegisterIds));
        p.Add("@ImportedCount", dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.Output);

        var row = await _executor.QuerySingleOrDefaultAsync<ImportAccountRegisterResultDto>(
            "dbo.sp_Audit_AccountRegister_Import",
            p,
            cancellationToken).ConfigureAwait(false);

        return row ?? new ImportAccountRegisterResultDto
        {
            ImportedCount = p.Get<int?>("@ImportedCount") ?? 0,
            SkippedCount = p.Get<int?>("@SkippedCount") ?? 0
        };
    }

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
        p.Add("@OrgID", request.OrgID is > 0 ? request.OrgID : request.UnderOrgID);
        p.Add("@LedgerHead", request.LedgerHead);
        p.Add("@LedgerHeadEng", request.LedgerHeadEng);
        p.Add("@Description", request.Description);
        p.Add("@LedgerTypeID", request.LedgerTypeID);
        p.Add("@IsActive", request.IsActive);

        await _executor.ExecuteAsync("dbo.sp_Audit_LedgerHead_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@LedgerHeadID");
    }

    public async Task<ImportLedgerHeadResultDto> ImportLedgerHeadsAsync(
        long destinationUnderOrgId,
        IReadOnlyList<long> ledgerHeadIds,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationUnderOrgID", destinationUnderOrgId);
        p.Add("@DestinationOrgID", destinationUnderOrgId);
        p.Add("@LedgerHeadIdsJson", JsonSerializer.Serialize(ledgerHeadIds));
        p.Add("@ImportedCount", dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.Output);

        var row = await _executor.QuerySingleOrDefaultAsync<ImportLedgerHeadResultDto>(
            "dbo.sp_Audit_LedgerHead_Import",
            p,
            cancellationToken).ConfigureAwait(false);

        return row ?? new ImportLedgerHeadResultDto
        {
            ImportedCount = p.Get<int?>("@ImportedCount") ?? 0,
            SkippedCount = p.Get<int?>("@SkippedCount") ?? 0
        };
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
