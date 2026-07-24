using SmartEPR.Core.DTOs.Attendance;

namespace SmartEPR.Core.Interfaces;

public interface IAttendanceStatsService
{
    Task<AttendanceStatsDto> GetStatsAsync(long orgId, DateTime? date, CancellationToken cancellationToken = default);
}
