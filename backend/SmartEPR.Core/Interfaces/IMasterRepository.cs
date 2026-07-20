using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.DTOs.Master;

namespace SmartEPR.Core.Interfaces;

public interface IMasterRepository
{
    Task<IReadOnlyList<ClassMasterDto>> GetClassListAsync(long orgId, string? search, CancellationToken cancellationToken = default);
    Task<ClassMasterDto?> GetClassByIdAsync(long classId, CancellationToken cancellationToken = default);
    Task<long?> GetClassNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<long> SaveClassAsync(SaveClassRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteClassAsync(long classId, CancellationToken cancellationToken = default);
    Task<ImportClassResultDto> ImportClassesAsync(long destinationOrgId, IReadOnlyList<long> classIds, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SubjectMasterDto>> GetSubjectListAsync(string? search, CancellationToken cancellationToken = default);
    Task<SubjectMasterDto?> GetSubjectByIdAsync(long subjectId, CancellationToken cancellationToken = default);
    Task<long> SaveSubjectAsync(SaveSubjectRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteSubjectAsync(long subjectId, CancellationToken cancellationToken = default);

    Task<AcademicScheduleLookupsDto> GetAcademicScheduleLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<long> GetCurrentAyIdAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AcademicScheduleDto>> GetAcademicScheduleListAsync(AcademicScheduleListFilterDto filter, CancellationToken cancellationToken = default);
    Task<AcademicScheduleDto?> GetAcademicScheduleByIdAsync(long asid, CancellationToken cancellationToken = default);
    Task<long> SaveAcademicScheduleAsync(SaveAcademicScheduleRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteAcademicScheduleAsync(long asid, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ItemGroupMasterDto>> GetItemGroupListAsync(long orgId, string? search, CancellationToken cancellationToken = default);
    Task<ItemGroupMasterDto?> GetItemGroupByIdAsync(long itemGroupId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ItemGroupOptionDto>> GetItemGroupOptionsAsync(long orgId, CancellationToken cancellationToken = default);
    Task<long> SaveItemGroupAsync(SaveItemGroupRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteItemGroupAsync(long itemGroupId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ItemMasterDto>> GetItemListAsync(long orgId, string? search, CancellationToken cancellationToken = default);
    Task<ItemMasterDto?> GetItemByIdAsync(long itemId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ItemOptionDto>> GetItemOptionsAsync(long orgId, CancellationToken cancellationToken = default);
    Task<long> SaveItemAsync(SaveItemRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteItemAsync(long itemId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StockRegisterDto>> GetStockListAsync(long orgId, string? search, CancellationToken cancellationToken = default);
    Task<StockRegisterDto?> GetStockByIdAsync(long stockId, CancellationToken cancellationToken = default);
    Task<long> SaveStockAsync(SaveStockRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteStockAsync(long stockId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OrgOptionDto>> GetUserOrgsAsync(long userId, CancellationToken cancellationToken = default);
}

public interface IMasterService
{
    Task<IReadOnlyList<ClassMasterDto>> GetClassListAsync(long orgId, string? search, CancellationToken cancellationToken = default);
    Task<long?> GetClassNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<(ClassMasterDto? Data, string? Error)> SaveClassAsync(SaveClassRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteClassAsync(long classId, CancellationToken cancellationToken = default);
    Task<(ImportClassResultDto? Data, string? Error)> ImportClassesAsync(ImportClassRequestDto request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SubjectMasterDto>> GetSubjectListAsync(string? search, CancellationToken cancellationToken = default);
    Task<(SubjectMasterDto? Data, string? Error)> SaveSubjectAsync(SaveSubjectRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteSubjectAsync(long subjectId, CancellationToken cancellationToken = default);

    Task<AcademicScheduleLookupsDto> GetAcademicScheduleLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<long> GetCurrentAyIdAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AcademicScheduleDto>> GetAcademicScheduleListAsync(AcademicScheduleListFilterDto filter, CancellationToken cancellationToken = default);
    Task<AcademicScheduleDto?> GetAcademicScheduleByIdAsync(long asid, CancellationToken cancellationToken = default);
    Task<(AcademicScheduleDto? Data, string? Error)> SaveAcademicScheduleAsync(SaveAcademicScheduleRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteAcademicScheduleAsync(long asid, CancellationToken cancellationToken = default);

    Task<InventoryLookupsDto> GetInventoryLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ItemGroupMasterDto>> GetItemGroupListAsync(long orgId, string? search, CancellationToken cancellationToken = default);
    Task<(ItemGroupMasterDto? Data, string? Error)> SaveItemGroupAsync(SaveItemGroupRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteItemGroupAsync(long itemGroupId, CancellationToken cancellationToken = default);
    Task<(ImportClassResultDto? Data, string? Error)> ImportItemGroupsAsync(ImportItemGroupRequestDto request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ItemMasterDto>> GetItemListAsync(long orgId, string? search, CancellationToken cancellationToken = default);
    Task<(ItemMasterDto? Data, string? Error)> SaveItemAsync(SaveItemRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteItemAsync(long itemId, CancellationToken cancellationToken = default);
    Task<(ImportClassResultDto? Data, string? Error)> ImportItemsAsync(ImportItemRequestDto request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StockRegisterDto>> GetStockListAsync(long orgId, string? search, CancellationToken cancellationToken = default);
    Task<(StockRegisterDto? Data, string? Error)> SaveStockAsync(SaveStockRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteStockAsync(long stockId, CancellationToken cancellationToken = default);
}
