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

    public Task<IReadOnlyList<ClassMasterDto>> GetClassListAsync(long orgId, string? search, CancellationToken cancellationToken = default)
        => _repository.GetClassListAsync(orgId, search, cancellationToken);

    public Task<long?> GetClassNextSrNoAsync(long orgId, CancellationToken cancellationToken = default)
        => _repository.GetClassNextSrNoAsync(orgId, cancellationToken);

    public async Task<(ClassMasterDto? Data, string? Error)> SaveClassAsync(SaveClassRequestDto request, CancellationToken cancellationToken = default)
    {
        request.ClassName = MasterValidators.Trim(request.ClassName);
        var error = MasterValidators.FirstError(
            MasterValidators.RequirePositiveId(request.OrgID, "Organization"),
            MasterValidators.RequirePositiveId(request.SrNo, "Sr No"),
            MasterValidators.RequireText(request.ClassName, "Class name"));
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

    public async Task<(ImportClassResultDto? Data, string? Error)> ImportClassesAsync(
        ImportClassRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.DestinationOrgID <= 0)
            return (null, "Organization is required.");
        if (request.DestinationOrgID == 1)
            return (null, "Cannot import into the source organization.");
        if (request.ClassIds is null || request.ClassIds.Count == 0)
            return (null, "Select at least one class to import.");

        try
        {
            var result = await _repository.ImportClassesAsync(
                request.DestinationOrgID,
                request.ClassIds,
                cancellationToken).ConfigureAwait(false);
            return (result, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
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
            MasterValidators.RequirePositiveId(request.UnderOrgID, "Org / School"),
            MasterValidators.RequireMonth(request.TMonth),
            MasterValidators.RequirePositiveId(request.ClassID, "Class"),
            MasterValidators.RequirePositiveId(request.SubjectID, "Subject"),
            MasterValidators.RequirePositiveId(request.WeekID, "Week"),
            MasterValidators.RequireText(request.Title, "Title"));

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

    public async Task<(ImportClassResultDto? Data, string? Error)> ImportItemGroupsAsync(
        ImportItemGroupRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.DestinationOrgID <= 0)
            return (null, "Organization is required.");
        if (request.DestinationOrgID == 1)
            return (null, "Cannot import into the source organization.");
        if (request.ItemGroupIds is null || request.ItemGroupIds.Count == 0)
            return (null, "Select at least one item group to import.");

        try
        {
            const long sourceOrgId = 1;
            var selected = request.ItemGroupIds.Where(id => id > 0).Distinct().ToHashSet();
            var sourceRows = (await _repository.GetItemGroupListAsync(sourceOrgId, null, cancellationToken).ConfigureAwait(false))
                .Where(x => selected.Contains(x.ItemGroupID) && x.IsActive)
                .OrderBy(x => x.SrNo)
                .ThenBy(x => x.ItemGroupID)
                .ToList();

            var destRows = await _repository.GetItemGroupListAsync(request.DestinationOrgID, null, cancellationToken).ConfigureAwait(false);
            var existingNames = destRows
                .Select(x => x.ItemGroupName.Trim())
                .Where(x => x.Length > 0)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var imported = 0;
            var skipped = 0;

            foreach (var row in sourceRows)
            {
                var name = (row.ItemGroupName ?? string.Empty).Trim();
                if (name.Length == 0 || existingNames.Contains(name))
                {
                    skipped++;
                    continue;
                }

                await _repository.SaveItemGroupAsync(new SaveItemGroupRequestDto
                {
                    ItemGroupID = 0,
                    OrgID = request.DestinationOrgID,
                    ItemGroupName = name,
                    IsActive = row.IsActive
                }, cancellationToken).ConfigureAwait(false);

                existingNames.Add(name);
                imported++;
            }

            // Selected IDs that were missing/inactive at source count as skipped
            skipped += Math.Max(0, selected.Count - sourceRows.Count);

            return (new ImportClassResultDto { ImportedCount = imported, SkippedCount = skipped }, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
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

    public async Task<(ImportClassResultDto? Data, string? Error)> ImportItemsAsync(
        ImportItemRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.DestinationOrgID <= 0)
            return (null, "Organization is required.");
        if (request.DestinationOrgID == 1)
            return (null, "Cannot import into the source organization.");
        if (request.ItemIds is null || request.ItemIds.Count == 0)
            return (null, "Select at least one item to import.");

        try
        {
            const long sourceOrgId = 1;
            var selected = request.ItemIds.Where(id => id > 0).Distinct().ToHashSet();
            var sourceRows = (await _repository.GetItemListAsync(sourceOrgId, null, cancellationToken).ConfigureAwait(false))
                .Where(x => selected.Contains(x.ItemID) && x.IsActive)
                .OrderBy(x => x.ItemGroupName)
                .ThenBy(x => x.ItemName)
                .ThenBy(x => x.ItemID)
                .ToList();

            var destGroups = await _repository.GetItemGroupListAsync(request.DestinationOrgID, null, cancellationToken).ConfigureAwait(false);
            var destGroupByName = destGroups
                .Where(x => !string.IsNullOrWhiteSpace(x.ItemGroupName))
                .GroupBy(x => x.ItemGroupName.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().ItemGroupID, StringComparer.OrdinalIgnoreCase);

            var destItems = await _repository.GetItemListAsync(request.DestinationOrgID, null, cancellationToken).ConfigureAwait(false);
            var existingNames = destItems
                .Select(x => x.ItemName.Trim())
                .Where(x => x.Length > 0)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var imported = 0;
            var skipped = 0;

            foreach (var row in sourceRows)
            {
                var name = (row.ItemName ?? string.Empty).Trim();
                var groupName = (row.ItemGroupName ?? string.Empty).Trim();
                if (name.Length == 0
                    || existingNames.Contains(name)
                    || groupName.Length == 0
                    || !destGroupByName.TryGetValue(groupName, out var destGroupId))
                {
                    skipped++;
                    continue;
                }

                await _repository.SaveItemAsync(new SaveItemRequestDto
                {
                    ItemID = 0,
                    OrgID = request.DestinationOrgID,
                    ItemGroupID = destGroupId,
                    ItemName = name,
                    Rate = row.Rate,
                    IsActive = row.IsActive
                }, cancellationToken).ConfigureAwait(false);

                existingNames.Add(name);
                imported++;
            }

            skipped += Math.Max(0, selected.Count - sourceRows.Count);

            return (new ImportClassResultDto { ImportedCount = imported, SkippedCount = skipped }, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
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
