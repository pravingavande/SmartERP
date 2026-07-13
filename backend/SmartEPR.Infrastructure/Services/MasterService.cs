using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Core.Validation;

namespace SmartEPR.Infrastructure.Services;

public sealed class MasterService : IMasterService
{
    private readonly IMasterRepository _repository;

    public MasterService(IMasterRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<ClassMasterDto>> GetClassListAsync(string? search, CancellationToken cancellationToken = default)
        => _repository.GetClassListAsync(search, cancellationToken);

    public async Task<(ClassMasterDto? Data, string? Error)> SaveClassAsync(SaveClassRequestDto request, CancellationToken cancellationToken = default)
    {
        request.ClassName = MasterValidators.Trim(request.ClassName);
        var error = MasterValidators.FirstError(MasterValidators.RequireText(request.ClassName, "Class name"));
        if (error is not null) return (null, error);

        try
        {
            var id = await _repository.SaveClassAsync(request, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetClassByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null || string.IsNullOrWhiteSpace(saved.ClassName)
                ? (null, "Unable to save class.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteClassAsync(long classId, CancellationToken cancellationToken = default)
    {
        if (classId <= 0) return (false, "Class is required.");
        try
        {
            await _repository.DeleteClassAsync(classId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public Task<IReadOnlyList<SubjectMasterDto>> GetSubjectListAsync(string? search, CancellationToken cancellationToken = default)
        => _repository.GetSubjectListAsync(search, cancellationToken);

    public async Task<(SubjectMasterDto? Data, string? Error)> SaveSubjectAsync(SaveSubjectRequestDto request, CancellationToken cancellationToken = default)
    {
        request.SubjectName = MasterValidators.Trim(request.SubjectName);
        var error = MasterValidators.FirstError(MasterValidators.RequireText(request.SubjectName, "Subject name"));
        if (error is not null) return (null, error);

        try
        {
            var id = await _repository.SaveSubjectAsync(request, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetSubjectByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null || string.IsNullOrWhiteSpace(saved.SubjectName)
                ? (null, "Unable to save subject.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteSubjectAsync(long subjectId, CancellationToken cancellationToken = default)
    {
        if (subjectId <= 0) return (false, "Subject is required.");
        try
        {
            await _repository.DeleteSubjectAsync(subjectId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public Task<AcademicScheduleLookupsDto> GetAcademicScheduleLookupsAsync(long userId, CancellationToken cancellationToken = default)
        => _repository.GetAcademicScheduleLookupsAsync(userId, cancellationToken);

    public Task<long> GetCurrentAyIdAsync(CancellationToken cancellationToken = default)
        => _repository.GetCurrentAyIdAsync(cancellationToken);

    public Task<IReadOnlyList<AcademicScheduleDto>> GetAcademicScheduleListAsync(AcademicScheduleListFilterDto filter, CancellationToken cancellationToken = default)
        => _repository.GetAcademicScheduleListAsync(filter, cancellationToken);

    public Task<AcademicScheduleDto?> GetAcademicScheduleByIdAsync(long asid, CancellationToken cancellationToken = default)
        => _repository.GetAcademicScheduleByIdAsync(asid, cancellationToken);

    public async Task<(AcademicScheduleDto? Data, string? Error)> SaveAcademicScheduleAsync(SaveAcademicScheduleRequestDto request, CancellationToken cancellationToken = default)
    {
        request.Title = MasterValidators.Trim(request.Title);
        request.Description = string.IsNullOrWhiteSpace(request.Description) ? null : MasterValidators.Trim(request.Description);

        var error = MasterValidators.FirstError(
            MasterValidators.RequirePositiveId(request.UnderOrgID, "Under organization"),
            MasterValidators.RequireMonth(request.TMonth),
            MasterValidators.RequirePositiveId(request.ClassID, "Class"),
            MasterValidators.RequirePositiveId(request.SubjectID, "Subject"),
            MasterValidators.RequirePositiveId(request.WeekID, "Week"),
            MasterValidators.RequireText(request.Title, "Title"),
            MasterValidators.RequireDate(request.TDate, "Date"));

        if (error is not null) return (null, error);

        try
        {
            if (request.AyID <= 0)
                request.AyID = await _repository.GetCurrentAyIdAsync(cancellationToken).ConfigureAwait(false);

            if (request.AyID <= 0)
                return (null, "Academic year is required.");

            var id = await _repository.SaveAcademicScheduleAsync(request, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetAcademicScheduleByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null || string.IsNullOrWhiteSpace(saved.Title)
                ? (null, "Unable to save academic schedule.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteAcademicScheduleAsync(long asid, CancellationToken cancellationToken = default)
    {
        if (asid <= 0) return (false, "Academic schedule is required.");
        try
        {
            await _repository.DeleteAcademicScheduleAsync(asid, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public async Task<InventoryLookupsDto> GetInventoryLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var orgs = await _repository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        return new InventoryLookupsDto { Orgs = orgs };
    }

    public Task<IReadOnlyList<ItemGroupMasterDto>> GetItemGroupListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
        => _repository.GetItemGroupListAsync(orgId, search, cancellationToken);

    public async Task<(ItemGroupMasterDto? Data, string? Error)> SaveItemGroupAsync(SaveItemGroupRequestDto request, CancellationToken cancellationToken = default)
    {
        request.ItemGroupName = MasterValidators.Trim(request.ItemGroupName);
        var error = MasterValidators.FirstError(
            MasterValidators.RequirePositiveId(request.OrgID, "Organization"),
            MasterValidators.RequireText(request.ItemGroupName, "Item group name"));

        if (error is not null) return (null, error);

        try
        {
            var id = await _repository.SaveItemGroupAsync(request, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetItemGroupByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null || string.IsNullOrWhiteSpace(saved.ItemGroupName)
                ? (null, "Unable to save item group.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteItemGroupAsync(long itemGroupId, CancellationToken cancellationToken = default)
    {
        if (itemGroupId <= 0) return (false, "Item group is required.");
        try
        {
            await _repository.DeleteItemGroupAsync(itemGroupId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public Task<IReadOnlyList<ItemMasterDto>> GetItemListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
        => _repository.GetItemListAsync(orgId, search, cancellationToken);

    public async Task<(ItemMasterDto? Data, string? Error)> SaveItemAsync(SaveItemRequestDto request, CancellationToken cancellationToken = default)
    {
        request.ItemName = MasterValidators.Trim(request.ItemName);
        var error = MasterValidators.FirstError(
            MasterValidators.RequirePositiveId(request.OrgID, "Organization"),
            MasterValidators.RequirePositiveId(request.ItemGroupID, "Item group"),
            MasterValidators.RequireText(request.ItemName, "Item name"),
            MasterValidators.RequireNonNegativeDecimal(request.Rate, "Rate"));

        if (error is not null) return (null, error);

        try
        {
            var id = await _repository.SaveItemAsync(request, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetItemByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null || string.IsNullOrWhiteSpace(saved.ItemName)
                ? (null, "Unable to save item.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteItemAsync(long itemId, CancellationToken cancellationToken = default)
    {
        if (itemId <= 0) return (false, "Item is required.");
        try
        {
            await _repository.DeleteItemAsync(itemId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public Task<IReadOnlyList<StockRegisterDto>> GetStockListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
        => _repository.GetStockListAsync(orgId, search, cancellationToken);

    public async Task<(StockRegisterDto? Data, string? Error)> SaveStockAsync(SaveStockRequestDto request, CancellationToken cancellationToken = default)
    {
        request.Remark = string.IsNullOrWhiteSpace(request.Remark) ? null : MasterValidators.Trim(request.Remark);
        var error = MasterValidators.FirstError(
            MasterValidators.RequirePositiveId(request.OrgID, "Organization"),
            MasterValidators.RequirePositiveId(request.ItemID, "Item"),
            MasterValidators.RequirePositiveDecimal(request.Qty, "Quantity"),
            MasterValidators.RequireNonNegativeDecimal(request.Rate, "Rate"));

        if (error is not null) return (null, error);

        try
        {
            var id = await _repository.SaveStockAsync(request, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetStockByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null ? (null, "Unable to save stock entry.") : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteStockAsync(long stockId, CancellationToken cancellationToken = default)
    {
        if (stockId <= 0) return (false, "Stock entry is required.");
        try
        {
            await _repository.DeleteStockAsync(stockId, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }
}
