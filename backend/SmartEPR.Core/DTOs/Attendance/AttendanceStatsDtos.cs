namespace SmartEPR.Core.DTOs.Attendance;

public sealed class AttendanceStatsDto
{
    public int TotalEmployees { get; init; }
    public int TodayAttendance { get; init; }
    public int LateCheckIns { get; init; }
    public int AbsentEmployees { get; init; }
    public int LeaveCount { get; init; }
    public int WeekOffCount { get; init; }
    public int PendingConfirmations { get; init; }
}
