using SmartEPR.Core.DTOs.Leave;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class LeaveService : ILeaveService
{
    private readonly ILeaveRepository _leaveRepository;
    private readonly IAuditVoucherRepository _auditRepository;
    private readonly IEmployeeRepository _employeeRepository;

    public LeaveService(
        ILeaveRepository leaveRepository,
        IAuditVoucherRepository auditRepository,
        IEmployeeRepository employeeRepository)
    {
        _leaveRepository = leaveRepository;
        _auditRepository = auditRepository;
        _employeeRepository = employeeRepository;
    }

    public Task<IReadOnlyList<LeaveTypeDto>> GetLeaveTypeListAsync(CancellationToken cancellationToken = default)
        => _leaveRepository.GetLeaveTypeListAsync(cancellationToken);

    public async Task<LeaveTypeDto?> SaveLeaveTypeAsync(SaveLeaveTypeRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.LeaveTypeName))
            return null;

        var id = await _leaveRepository.SaveLeaveTypeAsync(request, cancellationToken).ConfigureAwait(false);
        return await _leaveRepository.GetLeaveTypeByIdAsync(id, cancellationToken).ConfigureAwait(false);
    }

    public async Task<LeaveApplyLookupsBundleDto> GetLeaveApplyLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var lookups = await _leaveRepository.GetLeaveApplyLookupsAsync(cancellationToken).ConfigureAwait(false);
        var orgs = await _auditRepository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        return new LeaveApplyLookupsBundleDto
        {
            Orgs = orgs.ToArray(),
            Lookups = lookups
        };
    }

    public async Task<IReadOnlyList<EmployeeOptionDto>> GetEmployeesByOrgAsync(long orgId, CancellationToken cancellationToken = default)
    {
        var list = await _employeeRepository.GetListAsync(orgId, null, cancellationToken).ConfigureAwait(false);
        return list
            .Select(x => new EmployeeOptionDto
            {
                UserID = x.UserID,
                DisplayName = x.DisplayName,
                MobileNo1 = x.MobileNo1
            })
            .ToList();
    }

    public Task<long> GetNextRecordNoAsync(long orgId, CancellationToken cancellationToken = default)
        => _leaveRepository.GetNextRecordNoAsync(orgId, cancellationToken);

    public Task<IReadOnlyList<LeaveApplyListItemDto>> GetLeaveApplyListAsync(long? orgId, long? ayId, CancellationToken cancellationToken = default)
        => _leaveRepository.GetLeaveApplyListAsync(orgId, ayId, cancellationToken);

    public Task<LeaveApplyDto?> GetLeaveApplyByIdAsync(long userLeaveApplyId, CancellationToken cancellationToken = default)
        => _leaveRepository.GetLeaveApplyByIdAsync(userLeaveApplyId, cancellationToken);

    public async Task<LeaveApplyDto?> SaveLeaveApplyAsync(SaveLeaveApplyRequestDto request, CancellationToken cancellationToken = default)
    {
        if (!request.OrgID.HasValue || !request.UserID.HasValue || !request.LeaveTypeID.HasValue)
            return null;
        if (!request.FromDate.HasValue || !request.ToDate.HasValue)
            return null;

        var id = await _leaveRepository.SaveLeaveApplyAsync(request, cancellationToken).ConfigureAwait(false);
        return await _leaveRepository.GetLeaveApplyByIdAsync(id, cancellationToken).ConfigureAwait(false);
    }
}
