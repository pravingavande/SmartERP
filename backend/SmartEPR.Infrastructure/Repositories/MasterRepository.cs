using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class MasterRepository : IMasterRepository
{
    private readonly StoredProcedureExecutor _executor;
    private readonly SqlConnectionFactory _connectionFactory;

    public MasterRepository(StoredProcedureExecutor executor, SqlConnectionFactory connectionFactory)
    {
        _executor = executor;
        _connectionFactory = connectionFactory;
    }

    public Task<IReadOnlyList<ClassMasterDto>> GetClassListAsync(string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@Search", search);
        return _executor.QueryListAsync<ClassMasterDto>("dbo.sp_Class_GetList", p, cancellationToken);
    }

    public Task<ClassMasterDto?> GetClassByIdAsync(long classId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ClassID", classId);
        return _executor.QuerySingleOrDefaultAsync<ClassMasterDto>("dbo.sp_Class_GetById", p, cancellationToken);
    }

    public async Task<long> SaveClassAsync(SaveClassRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ClassID", request.ClassID > 0 ? request.ClassID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@ClassName", request.ClassName);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_Class_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@ClassID");
    }

    public Task DeleteClassAsync(long classId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ClassID", classId);
        return _executor.ExecuteAsync("dbo.sp_Class_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<SubjectMasterDto>> GetSubjectListAsync(string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@Search", search);
        return _executor.QueryListAsync<SubjectMasterDto>("dbo.sp_Subject_GetList", p, cancellationToken);
    }

    public Task<SubjectMasterDto?> GetSubjectByIdAsync(long subjectId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@SubjectID", subjectId);
        return _executor.QuerySingleOrDefaultAsync<SubjectMasterDto>("dbo.sp_Subject_GetById", p, cancellationToken);
    }

    public async Task<long> SaveSubjectAsync(SaveSubjectRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@SubjectID", request.SubjectID > 0 ? request.SubjectID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@SubjectName", request.SubjectName);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_Subject_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@SubjectID");
    }

    public Task DeleteSubjectAsync(long subjectId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@SubjectID", subjectId);
        return _executor.ExecuteAsync("dbo.sp_Subject_Delete", p, cancellationToken);
    }

    public async Task<AcademicScheduleLookupsDto> GetAcademicScheduleLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_AcademicSchedule_GetLookups",
                new { UserID = userId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var sansthaOrgs = (await multi.ReadAsync<OrgOptionDto>().ConfigureAwait(false)).AsList();
        var classes = (await multi.ReadAsync<ClassLookupRow>().ConfigureAwait(false)).AsList();
        var subjects = (await multi.ReadAsync<SubjectLookupRow>().ConfigureAwait(false)).AsList();
        var weeks = (await multi.ReadAsync<WeekOptionDto>().ConfigureAwait(false)).AsList();
        var ayList = (await multi.ReadAsync<AyMasterOptionDto>().ConfigureAwait(false)).AsList();

        return new AcademicScheduleLookupsDto
        {
            SansthaOrgs = sansthaOrgs,
            Classes = classes.Select(x => new MasterOptionDto { Id = x.ClassID, Name = x.ClassName ?? string.Empty }).ToList(),
            Subjects = subjects.Select(x => new MasterOptionDto { Id = x.SubjectID, Name = x.SubjectName ?? string.Empty }).ToList(),
            Weeks = weeks,
            AyList = ayList
        };
    }

    public async Task<long> GetCurrentAyIdAsync(CancellationToken cancellationToken = default)
    {
        var row = await _executor.QuerySingleOrDefaultAsync<CurrentAyDto>("dbo.sp_AcademicSchedule_GetCurrentAyId", null, cancellationToken).ConfigureAwait(false);
        return row?.AyID ?? 0;
    }

    public Task<IReadOnlyList<AcademicScheduleDto>> GetAcademicScheduleListAsync(AcademicScheduleListFilterDto filter, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", filter.UnderOrgID);
        p.Add("@ClassID", filter.ClassID);
        p.Add("@SubjectID", filter.SubjectID);
        p.Add("@TMonth", filter.TMonth);
        p.Add("@WeekID", filter.WeekID);
        p.Add("@FromDate", filter.FromDate);
        p.Add("@ToDate", filter.ToDate);
        p.Add("@AyID", filter.AyID);
        p.Add("@Search", filter.Search);
        return _executor.QueryListAsync<AcademicScheduleDto>("dbo.sp_AcademicSchedule_GetList", p, cancellationToken);
    }

    public Task<AcademicScheduleDto?> GetAcademicScheduleByIdAsync(long asid, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ASID", asid);
        return _executor.QuerySingleOrDefaultAsync<AcademicScheduleDto>("dbo.sp_AcademicSchedule_GetById", p, cancellationToken);
    }

    public async Task<long> SaveAcademicScheduleAsync(SaveAcademicScheduleRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ASID", request.ASID > 0 ? request.ASID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@TMonth", request.TMonth);
        p.Add("@ClassID", request.ClassID);
        p.Add("@SubjectID", request.SubjectID);
        p.Add("@SrNo", request.SrNo > 0 ? request.SrNo : null);
        p.Add("@Title", request.Title);
        p.Add("@Description", request.Description);
        p.Add("@WeekID", request.WeekID);
        p.Add("@FileAttachment", request.FileAttachment);
        p.Add("@AyID", request.AyID > 0 ? request.AyID : null);
        await _executor.ExecuteAsync("dbo.sp_AcademicSchedule_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@ASID");
    }

    public Task DeleteAcademicScheduleAsync(long asid, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ASID", asid);
        return _executor.ExecuteAsync("dbo.sp_AcademicSchedule_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<ItemGroupMasterDto>> GetItemGroupListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<ItemGroupMasterDto>("dbo.sp_ItemGroup_GetList", p, cancellationToken);
    }

    public Task<ItemGroupMasterDto?> GetItemGroupByIdAsync(long itemGroupId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ItemGroupID", itemGroupId);
        return _executor.QuerySingleOrDefaultAsync<ItemGroupMasterDto>("dbo.sp_ItemGroup_GetById", p, cancellationToken);
    }

    public Task<IReadOnlyList<ItemGroupOptionDto>> GetItemGroupOptionsAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<ItemGroupOptionDto>("dbo.sp_ItemGroup_GetOptions", p, cancellationToken);
    }

    public async Task<long> SaveItemGroupAsync(SaveItemGroupRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ItemGroupID", request.ItemGroupID > 0 ? request.ItemGroupID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@ItemGroupName", request.ItemGroupName);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_ItemGroup_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@ItemGroupID");
    }

    public Task DeleteItemGroupAsync(long itemGroupId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ItemGroupID", itemGroupId);
        return _executor.ExecuteAsync("dbo.sp_ItemGroup_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<ItemMasterDto>> GetItemListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<ItemMasterDto>("dbo.sp_Item_GetList", p, cancellationToken);
    }

    public Task<ItemMasterDto?> GetItemByIdAsync(long itemId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ItemID", itemId);
        return _executor.QuerySingleOrDefaultAsync<ItemMasterDto>("dbo.sp_Item_GetById", p, cancellationToken);
    }

    public Task<IReadOnlyList<ItemOptionDto>> GetItemOptionsAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        return _executor.QueryListAsync<ItemOptionDto>("dbo.sp_Item_GetOptions", p, cancellationToken);
    }

    public async Task<long> SaveItemAsync(SaveItemRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ItemID", request.ItemID > 0 ? request.ItemID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@ItemGroupID", request.ItemGroupID);
        p.Add("@ItemName", request.ItemName);
        p.Add("@Rate", request.Rate);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_Item_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@ItemID");
    }

    public Task DeleteItemAsync(long itemId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ItemID", itemId);
        return _executor.ExecuteAsync("dbo.sp_Item_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<StockRegisterDto>> GetStockListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<StockRegisterDto>("dbo.sp_Stock_GetList", p, cancellationToken);
    }

    public Task<StockRegisterDto?> GetStockByIdAsync(long stockId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@StockID", stockId);
        return _executor.QuerySingleOrDefaultAsync<StockRegisterDto>("dbo.sp_Stock_GetById", p, cancellationToken);
    }

    public async Task<long> SaveStockAsync(SaveStockRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@StockID", request.StockID > 0 ? request.StockID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@ItemID", request.ItemID);
        p.Add("@Qty", request.Qty);
        p.Add("@Rate", request.Rate);
        p.Add("@Remark", request.Remark);
        await _executor.ExecuteAsync("dbo.sp_Stock_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@StockID");
    }

    public Task DeleteStockAsync(long stockId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@StockID", stockId);
        return _executor.ExecuteAsync("dbo.sp_Stock_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<OrgOptionDto>> GetUserOrgsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        return _executor.QueryListAsync<OrgOptionDto>("dbo.sp_Audit_GetUserOrgs", p, cancellationToken);
    }

    private sealed class ClassLookupRow
    {
        public long ClassID { get; init; }
        public string? ClassName { get; init; }
    }

    private sealed class SubjectLookupRow
    {
        public long SubjectID { get; init; }
        public string? SubjectName { get; init; }
    }
}
