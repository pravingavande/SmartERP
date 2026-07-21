using SmartEPR.Core.DTOs.Leave;
using SmartEPR.Core.DTOs.Master;

namespace SmartEPR.Core.Interfaces;

public interface ILeaveRepository
{
    Task<IReadOnlyList<LeaveTypeDto>> GetLeaveTypeListAsync(long orgId, string? search = null, CancellationToken cancellationToken = default);
    Task<LeaveTypeDto?> GetLeaveTypeByIdAsync(long leaveTypeId, CancellationToken cancellationToken = default);
    Task<long> GetLeaveTypeNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<long> SaveLeaveTypeAsync(SaveLeaveTypeRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteLeaveTypeAsync(long leaveTypeId, CancellationToken cancellationToken = default);
    Task<ImportClassResultDto> ImportLeaveTypesAsync(long destinationOrgId, IReadOnlyList<long> leaveTypeIds, CancellationToken cancellationToken = default);
    Task<LeaveApplyLookupsDto> GetLeaveApplyLookupsAsync(CancellationToken cancellationToken = default);
    Task<long> GetNextRecordNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LeaveApplyListItemDto>> GetLeaveApplyListAsync(long? orgId, long? ayId, CancellationToken cancellationToken = default);
    Task<LeaveApplyDto?> GetLeaveApplyByIdAsync(long userLeaveApplyId, CancellationToken cancellationToken = default);
    Task<long> SaveLeaveApplyAsync(SaveLeaveApplyRequestDto request, CancellationToken cancellationToken = default);
}

public interface ILeaveService
{
    Task<IReadOnlyList<LeaveTypeDto>> GetLeaveTypeListAsync(long orgId, string? search = null, CancellationToken cancellationToken = default);
    Task<long> GetLeaveTypeNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<LeaveTypeDto?> SaveLeaveTypeAsync(SaveLeaveTypeRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteLeaveTypeAsync(long leaveTypeId, CancellationToken cancellationToken = default);
    Task<(ImportClassResultDto? Data, string? Error)> ImportLeaveTypesAsync(ImportLeaveTypeRequestDto request, CancellationToken cancellationToken = default);
    Task<LeaveApplyLookupsBundleDto> GetLeaveApplyLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeOptionDto>> GetEmployeesByOrgAsync(long orgId, CancellationToken cancellationToken = default);
    Task<long> GetNextRecordNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LeaveApplyListItemDto>> GetLeaveApplyListAsync(long? orgId, long? ayId, CancellationToken cancellationToken = default);
    Task<LeaveApplyDto?> GetLeaveApplyByIdAsync(long userLeaveApplyId, CancellationToken cancellationToken = default);
    Task<LeaveApplyDto?> SaveLeaveApplyAsync(SaveLeaveApplyRequestDto request, CancellationToken cancellationToken = default);
}
