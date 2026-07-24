using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Core.Interfaces;

public interface IAttendanceShiftRepository
{
    Task<IReadOnlyList<AttendanceShiftDto>> GetListAsync(long orgId, CancellationToken cancellationToken = default);
    Task<AttendanceShiftDto?> GetByIdAsync(long shiftId, long orgId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(AttendanceShiftDto shift, CancellationToken cancellationToken = default);
    Task DeleteAsync(long shiftId, long orgId, CancellationToken cancellationToken = default);
}

public interface IAttendanceShiftService
{
    Task<IReadOnlyList<AttendanceShiftDto>> GetListAsync(long orgId, CancellationToken cancellationToken = default);
    Task<AttendanceShiftDto?> GetByIdAsync(long shiftId, long orgId, CancellationToken cancellationToken = default);
    Task<(AttendanceShiftDto? Data, string? Error)> CreateAsync(SaveAttendanceShiftRequestDto request, CancellationToken cancellationToken = default);
    Task<(AttendanceShiftDto? Data, string? Error)> UpdateAsync(long shiftId, UpdateAttendanceShiftRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteAsync(long shiftId, long orgId, CancellationToken cancellationToken = default);
}
