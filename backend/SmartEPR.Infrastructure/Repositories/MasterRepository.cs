using System.Data;
using System.Text.Json;
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

    public Task<IReadOnlyList<ClassMasterDto>> GetClassListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<ClassMasterDto>("dbo.sp_Class_GetList", p, cancellationToken);
    }

    public Task<ClassMasterDto?> GetClassByIdAsync(long classId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ClassID", classId);
        return _executor.QuerySingleOrDefaultAsync<ClassMasterDto>("dbo.sp_Class_GetById", p, cancellationToken);
    }

    public async Task<long?> GetClassNextSrNoAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextSrNoDto>("dbo.sp_Class_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo;
    }

    public async Task<long> SaveClassAsync(SaveClassRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ClassID", request.ClassID > 0 ? request.ClassID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@SrNo", request.SrNo > 0 ? request.SrNo : null);
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

    public async Task<ImportClassResultDto> ImportClassesAsync(
        long destinationOrgId,
        IReadOnlyList<long> classIds,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationOrgID", destinationOrgId);
        p.Add("@ClassIdsJson", JsonSerializer.Serialize(classIds));
        p.Add("@ImportedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);

        var row = await _executor.QuerySingleOrDefaultAsync<ImportClassResultDto>(
            "dbo.sp_Class_Import",
            p,
            cancellationToken).ConfigureAwait(false);

        return row ?? new ImportClassResultDto
        {
            ImportedCount = p.Get<int?>("@ImportedCount") ?? 0,
            SkippedCount = p.Get<int?>("@SkippedCount") ?? 0
        };
    }

    public Task<IReadOnlyList<DocumentMasterDto>> GetDocumentListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<DocumentMasterDto>("dbo.sp_Document_GetList", p, cancellationToken);
    }

    public Task<DocumentMasterDto?> GetDocumentByIdAsync(long documentId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DocumentID", documentId);
        return _executor.QuerySingleOrDefaultAsync<DocumentMasterDto>("dbo.sp_Document_GetById", p, cancellationToken);
    }

    public async Task<long?> GetDocumentNextSrNoAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextSrNoDto>("dbo.sp_Document_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo;
    }

    public Task<IReadOnlyList<DocumentTypeOptionDto>> GetDocumentTypesAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<DocumentTypeOptionDto>("dbo.sp_DocumentType_GetOptions", null, cancellationToken);

    public async Task<long> SaveDocumentAsync(SaveDocumentRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DocumentID", request.DocumentID > 0 ? request.DocumentID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@SrNo", request.SrNo > 0 ? request.SrNo : null);
        p.Add("@DocumentName", request.DocumentName);
        p.Add("@DocumentTypeID", request.DocumentTypeID > 0 ? request.DocumentTypeID : null);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_Document_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@DocumentID");
    }

    public Task DeleteDocumentAsync(long documentId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DocumentID", documentId);
        return _executor.ExecuteAsync("dbo.sp_Document_Delete", p, cancellationToken);
    }

    public async Task<ImportClassResultDto> ImportDocumentsAsync(long destinationOrgId, IReadOnlyList<long> documentIds, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationOrgID", destinationOrgId);
        p.Add("@DocumentIdsJson", JsonSerializer.Serialize(documentIds));
        p.Add("@ImportedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        var row = await _executor.QuerySingleOrDefaultAsync<ImportClassResultDto>("dbo.sp_Document_Import", p, cancellationToken).ConfigureAwait(false);
        return row ?? new ImportClassResultDto { ImportedCount = p.Get<int?>("@ImportedCount") ?? 0, SkippedCount = p.Get<int?>("@SkippedCount") ?? 0 };
    }

    public Task<IReadOnlyList<CategoryMasterDto>> GetCategoryListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@Search", search);
        return _executor.QueryListAsync<CategoryMasterDto>("dbo.sp_Category_GetList", p, cancellationToken);
    }

    public Task<CategoryMasterDto?> GetCategoryByIdAsync(long categoryId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@CategoryID", categoryId);
        return _executor.QuerySingleOrDefaultAsync<CategoryMasterDto>("dbo.sp_Category_GetById", p, cancellationToken);
    }

    public async Task<long> SaveCategoryAsync(SaveCategoryRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@CategoryID", request.CategoryID > 0 ? request.CategoryID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@CategoryName", request.CategoryName);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_Category_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@CategoryID");
    }

    public Task DeleteCategoryAsync(long categoryId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@CategoryID", categoryId);
        return _executor.ExecuteAsync("dbo.sp_Category_Delete", p, cancellationToken);
    }

    public async Task<ImportClassResultDto> ImportCategoriesAsync(long destinationOrgId, IReadOnlyList<long> categoryIds, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationOrgID", destinationOrgId);
        p.Add("@CategoryIdsJson", JsonSerializer.Serialize(categoryIds));
        p.Add("@ImportedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        var row = await _executor.QuerySingleOrDefaultAsync<ImportClassResultDto>("dbo.sp_Category_Import", p, cancellationToken).ConfigureAwait(false);
        return row ?? new ImportClassResultDto { ImportedCount = p.Get<int?>("@ImportedCount") ?? 0, SkippedCount = p.Get<int?>("@SkippedCount") ?? 0 };
    }

    public Task<IReadOnlyList<DesignationOptionDto>> GetDesignationMasterAsync(long? underOrgId = null, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<DesignationOptionDto>("dbo.sp_Designation_GetMaster", p, cancellationToken);
    }

    public Task<IReadOnlyList<DesignationMasterDto>> GetDesignationListAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QueryListAsync<DesignationMasterDto>("dbo.sp_Designation_GetList", p, cancellationToken);
    }

    public Task<DesignationMasterDto?> GetDesignationByIdAsync(long designationId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@Designation D", designationId);
        return _executor.QuerySingleOrDefaultAsync<DesignationMasterDto>("dbo.sp_Designation_GetById", p, cancellationToken);
    }

    public async Task<long> GetNextDesignationSrNoAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        var row = await _executor.QuerySingleOrDefaultAsync<NextSrNoDto>("dbo.sp_Designation_GetNextSrNo", p, cancellationToken).ConfigureAwait(false);
        return row?.NextSrNo ?? 1;
    }

    public async Task<long> SaveDesignationAsync(SaveDesignationRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DesignationID", request.DesignationID > 0 ? request.DesignationID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@UnderOrgID", request.UnderOrgID);
        p.Add("@SrNo", request.SrNo > 0 ? request.SrNo : null);
        p.Add("@DesignationName", request.DesignationName);
        p.Add("@DesignationNameShort", request.DesignationNameShort);
        p.Add("@LeaveYear", request.LeaveYear);
        p.Add("@HMOrPrincipal", request.HMOrPrincipal);
        p.Add("@IsActive", request.IsActive);
        await _executor.ExecuteAsync("dbo.sp_Designation_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@DesignationID");
    }

    public Task DeleteDesignationAsync(long designationId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DesignationID", designationId);
        return _executor.ExecuteAsync("dbo.sp_Designation_Delete", p, cancellationToken);
    }

    public async Task<ImportClassResultDto> ImportDesignationsAsync(
        long destinationUnderOrgId,
        IReadOnlyList<long> designationIds,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationUnderOrgID", destinationUnderOrgId);
        p.Add("@DesignationIdsJson", JsonSerializer.Serialize(designationIds));
        p.Add("@ImportedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);

        var row = await _executor.QuerySingleOrDefaultAsync<ImportClassResultDto>(
            "dbo.sp_Designation_Import",
            p,
            cancellationToken).ConfigureAwait(false);

        return row ?? new ImportClassResultDto
        {
            ImportedCount = p.Get<int?>("@ImportedCount") ?? 0,
            SkippedCount = p.Get<int?>("@SkippedCount") ?? 0
        };
    }

    public Task<IReadOnlyList<SubjectMasterDto>> GetSubjectListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
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
        p.Add("@UnderOrgID", request.UnderOrgID);
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

    public async Task<ImportClassResultDto> ImportSubjectsAsync(long destinationOrgId, IReadOnlyList<long> subjectIds, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@DestinationOrgID", destinationOrgId);
        p.Add("@SubjectIdsJson", JsonSerializer.Serialize(subjectIds));
        p.Add("@ImportedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        p.Add("@SkippedCount", dbType: DbType.Int32, direction: ParameterDirection.Output);
        var row = await _executor.QuerySingleOrDefaultAsync<ImportClassResultDto>("dbo.sp_Subject_Import", p, cancellationToken).ConfigureAwait(false);
        return row ?? new ImportClassResultDto { ImportedCount = p.Get<int?>("@ImportedCount") ?? 0, SkippedCount = p.Get<int?>("@SkippedCount") ?? 0 };
    }

    public async Task<AcademicScheduleLookupsDto> GetAcademicScheduleLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        // Same school org source as Teacher Master (authoritative)
        var orgs = await GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);

        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_AcademicSchedule_GetLookups",
                new { UserID = userId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        // Discard SP org result set (legacy sanstha-only or updated GetUserOrgs) — we use GetUserOrgs above
        _ = (await multi.ReadAsync<OrgOptionDto>().ConfigureAwait(false)).AsList();
        var classes = (await multi.ReadAsync<ClassLookupRow>().ConfigureAwait(false)).AsList();
        var subjects = (await multi.ReadAsync<SubjectLookupRow>().ConfigureAwait(false)).AsList();
        var weeks = (await multi.ReadAsync<WeekOptionDto>().ConfigureAwait(false)).AsList();
        var ayList = (await multi.ReadAsync<AyMasterOptionDto>().ConfigureAwait(false)).AsList();

        return new AcademicScheduleLookupsDto
        {
            Orgs = orgs,
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
