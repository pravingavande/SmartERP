using System.Data;
using System.Text.Json;
using Dapper;
using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Leave;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class LeaveRepository : ILeaveRepository
{
    private readonly SqlConnectionFactory _connectionFactory;
    private readonly StoredProcedureExecutor _executor;

    public LeaveRepository(SqlConnectionFactory connectionFactory, StoredProcedureExecutor executor)
    {
        _connectionFactory = connectionFactory;
        _executor = executor;
    }

    public Task<IReadOnlyList<LeaveTypeDto>> GetLeaveTypeListAsync(long orgId, string? search = null, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<LeaveTypeDto>("dbo.sp_LeaveType_GetList", p, cancellationToken);
    }

    public Task<LeaveTypeDto?> GetLeaveTypeByIdAsync(long leaveTypeId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LeaveTypeID", leaveTypeId);
        return _executor.QuerySingleOrDefaultAsync<LeaveTypeDto>("dbo.sp_LeaveType_GetById", p, cancellationToken);
    }

    public async Task<long> GetLeaveTypeNextSrNoAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        var row = await _executor.QuerySingleOrDefaultAsync<SmartEPR.Core.DTOs.Master.NextSrNoDto>("dbo.sp_LeaveType_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo ?? 1;
    }

    public async Task<long> SaveLeaveTypeAsync(SaveLeaveTypeRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LeaveTypeID", request.LeaveTypeID > 0 ? request.LeaveTypeID : null, dbType: DbType.Int64, direction: ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@SrNo", request.SrNo > 0 ? request.SrNo : null);
        p.Add("@LeaveTypeName", request.LeaveTypeName);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_LeaveType_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@LeaveTypeID");
    }

    public Task DeleteLeaveTypeAsync(long leaveTypeId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@LeaveTypeID", leaveTypeId);
        return _executor.ExecuteAsync("dbo.sp_LeaveType_Delete", p, cancellationToken);
    }

    public async Task<ImportClassResultDto> ImportLeaveTypesAsync(
        long destinationOrgId,
        IReadOnlyList<long> leaveTypeIds,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationOrgID", destinationOrgId);
        p.Add("@LeaveTypeIdsJson", JsonSerializer.Serialize(leaveTypeIds));
        p.Add("@ImportedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);

        var row = await _executor.QuerySingleOrDefaultAsync<ImportClassResultDto>(
            "dbo.sp_LeaveType_Import",
            p,
            cancellationToken).ConfigureAwait(false);

        return row ?? new ImportClassResultDto
        {
            ImportedCount = p.Get<int?>("@ImportedCount") ?? 0,
            SkippedCount = p.Get<int?>("@SkippedCount") ?? 0
        };
    }

    public async Task<LeaveApplyLookupsDto> GetLeaveApplyLookupsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_LeaveApply_GetLookups",
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var leaveTypes = (await multi.ReadAsync<LeaveTypeLookupRow>().ConfigureAwait(false)).AsList();
        var permissions = (await multi.ReadAsync<LeavePermissionLookupRow>().ConfigureAwait(false)).AsList();
        var ayList = (await multi.ReadAsync<AyOptionDto>().ConfigureAwait(false)).AsList();

        return new LeaveApplyLookupsDto
        {
            LeaveTypes = leaveTypes.Select(x => new LeaveOptionDto { Id = x.LeaveTypeID, Name = x.LeaveTypeName ?? string.Empty }).ToList(),
            LeavePermissions = permissions.Select(x => new LeaveOptionDto { Id = x.LeavePermissionID, Name = x.LeavePermissionName ?? string.Empty }).ToList(),
            AyList = ayList
        };
    }

    public async Task<long> GetNextRecordNoAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextRecordNoDto>("dbo.sp_LeaveApply_GetNextRecordNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextRecordNo ?? 1;
    }

    public Task<IReadOnlyList<LeaveApplyListItemDto>> GetLeaveApplyListAsync(long? orgId, long? ayId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@AyID", ayId);
        return _executor.QueryListAsync<LeaveApplyListItemDto>("dbo.sp_LeaveApply_GetList", p, cancellationToken);
    }

    public Task<LeaveApplyDto?> GetLeaveApplyByIdAsync(long userLeaveApplyId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserLeaveApplyID", userLeaveApplyId);
        return _executor.QuerySingleOrDefaultAsync<LeaveApplyDto>("dbo.sp_LeaveApply_GetById", p, cancellationToken);
    }

    public async Task<long> SaveLeaveApplyAsync(SaveLeaveApplyRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserLeaveApplyID", request.UserLeaveApplyID > 0 ? request.UserLeaveApplyID : null, dbType: DbType.Int64, direction: ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@RecordNo", request.RecordNo);
        p.Add("@TDate", request.TDate);
        p.Add("@UserID", request.UserID);
        p.Add("@LeaveTypeID", request.LeaveTypeID);
        p.Add("@LeaveReason", request.LeaveReason);
        p.Add("@FromDate", request.FromDate);
        p.Add("@ToDate", request.ToDate);
        p.Add("@AdminRemak", request.AdminRemak);
        p.Add("@LeavePermissionID", request.LeavePermissionID);
        p.Add("@AyID", request.AyID);
        await _executor.ExecuteAsync("dbo.sp_LeaveApply_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@UserLeaveApplyID");
    }

    private sealed class LeaveTypeLookupRow
    {
        public long LeaveTypeID { get; init; }
        public string? LeaveTypeName { get; init; }
    }

    private sealed class LeavePermissionLookupRow
    {
        public long LeavePermissionID { get; init; }
        public string? LeavePermissionName { get; init; }
    }
}
