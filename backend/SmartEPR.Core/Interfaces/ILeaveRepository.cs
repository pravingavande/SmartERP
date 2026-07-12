using SmartEPR.Core.DTOs.Leave;

namespace SmartEPR.Core.Interfaces;

public interface ILeaveRepository
{
    Task<IReadOnlyList<LeaveTypeDto>> GetLeaveTypeListAsync(CancellationToken cancellationToken = default);
    Task<LeaveTypeDto?> GetLeaveTypeByIdAsync(long leaveTypeId, CancellationToken cancellationToken = default);
    Task<long> SaveLeaveTypeAsync(SaveLeaveTypeRequestDto request, CancellationToken cancellationToken = default);
    Task<LeaveApplyLookupsDto> GetLeaveApplyLookupsAsync(CancellationToken cancellationToken = default);
    Task<long> GetNextRecordNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LeaveApplyListItemDto>> GetLeaveApplyListAsync(long? orgId, long? ayId, CancellationToken cancellationToken = default);
    Task<LeaveApplyDto?> GetLeaveApplyByIdAsync(long userLeaveApplyId, CancellationToken cancellationToken = default);
    Task<long> SaveLeaveApplyAsync(SaveLeaveApplyRequestDto request, CancellationToken cancellationToken = default);
}

public interface ILeaveService
{
    Task<IReadOnlyList<LeaveTypeDto>> GetLeaveTypeListAsync(CancellationToken cancellationToken = default);
    Task<LeaveTypeDto?> SaveLeaveTypeAsync(SaveLeaveTypeRequestDto request, CancellationToken cancellationToken = default);
    Task<LeaveApplyLookupsBundleDto> GetLeaveApplyLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeOptionDto>> GetEmployeesByOrgAsync(long orgId, CancellationToken cancellationToken = default);
    Task<long> GetNextRecordNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LeaveApplyListItemDto>> GetLeaveApplyListAsync(long? orgId, long? ayId, CancellationToken cancellationToken = default);
    Task<LeaveApplyDto?> GetLeaveApplyByIdAsync(long userLeaveApplyId, CancellationToken cancellationToken = default);
    Task<LeaveApplyDto?> SaveLeaveApplyAsync(SaveLeaveApplyRequestDto request, CancellationToken cancellationToken = default);
}
