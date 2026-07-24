using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Core.Interfaces;

public interface IAttendancePayrollRepository
{
    Task<IReadOnlyList<AttendancePayrollEmployeeSourceDto>> GetEmployeesAsync(long orgId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AttendancePayrollPresentDateDto>> GetPresentDatesAsync(long orgId, DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AttendancePayrollApprovedLeaveDto>> GetApprovedLeavesAsync(long orgId, DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
}

public interface IAttendancePayrollService
{
    Task<IReadOnlyList<AttendancePayrollRowDto>> GetTeamPayrollAsync(long orgId, int year, int month, CancellationToken cancellationToken = default);
    Task<AttendancePayrollRowDto?> GetEmployeePayrollAsync(long orgId, long userId, int year, int month, CancellationToken cancellationToken = default);
    Task<AttendancePayrollRowDto?> GetMyPayrollAsync(long orgId, long userId, int year, int month, CancellationToken cancellationToken = default);
}
