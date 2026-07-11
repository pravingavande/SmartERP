using SmartEPR.Core.DTOs.Employee;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class EmployeeService : IEmployeeService
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IAuditVoucherRepository _auditRepository;

    public EmployeeService(IEmployeeRepository employeeRepository, IAuditVoucherRepository auditRepository)
    {
        _employeeRepository = employeeRepository;
        _auditRepository = auditRepository;
    }

    public async Task<EmployeeLookupsBundleDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var lookups = await _employeeRepository.GetLookupsAsync(cancellationToken).ConfigureAwait(false);
        var orgs = await _auditRepository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        return new EmployeeLookupsBundleDto
        {
            Lookups = lookups,
            Orgs = orgs
        };
    }

    public Task<IReadOnlyList<EmployeeListItemDto>> GetListAsync(long userId, long? orgId, string? search, CancellationToken cancellationToken = default)
        => _employeeRepository.GetListAsync(orgId, search, cancellationToken);

    public Task<EmployeeDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default)
        => _employeeRepository.GetByIdAsync(userId, cancellationToken);

    public async Task<EmployeeDto?> SaveAsync(SaveEmployeeRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Firstname) || string.IsNullOrWhiteSpace(request.MobileNo1))
            return null;

        var userId = await _employeeRepository.SaveAsync(request, cancellationToken).ConfigureAwait(false);
        return await _employeeRepository.GetByIdAsync(userId, cancellationToken).ConfigureAwait(false);
    }
}
