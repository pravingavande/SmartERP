using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Core.Interfaces;

public interface IAttendanceMonthlyOffRepository
{
    Task<IReadOnlyList<AttendanceMonthlyOffEmployeeSourceDto>> GetEmployeesAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AttendanceMonthlyOffOverrideRowDto>> GetOverridesAsync(long orgId, DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    Task SetOverrideAsync(long orgId, long userId, DateTime workDate, string overrideType, CancellationToken cancellationToken = default);
}

public interface IAttendanceMonthlyOffService
{
    Task<AttendanceMonthlyOffPlanDto> GetPlanAsync(long orgId, int year, int month, CancellationToken cancellationToken = default);
    Task<(AttendanceMonthlyOffSaveResultDto? Data, string? Error)> SaveChangesAsync(SaveAttendanceMonthlyOffRequestDto request, CancellationToken cancellationToken = default);
}
