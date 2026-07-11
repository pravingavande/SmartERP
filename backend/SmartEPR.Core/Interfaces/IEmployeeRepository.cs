using SmartEPR.Core.DTOs.Employee;

namespace SmartEPR.Core.Interfaces;

public interface IEmployeeRepository
{
    Task<EmployeeLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeListItemDto>> GetListAsync(long? orgId, string? search, CancellationToken cancellationToken = default);
    Task<EmployeeDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(SaveEmployeeRequestDto request, CancellationToken cancellationToken = default);
}

public interface IEmployeeService
{
    Task<EmployeeLookupsBundleDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeListItemDto>> GetListAsync(long userId, long? orgId, string? search, CancellationToken cancellationToken = default);
    Task<EmployeeDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default);
    Task<EmployeeDto?> SaveAsync(SaveEmployeeRequestDto request, CancellationToken cancellationToken = default);
}
