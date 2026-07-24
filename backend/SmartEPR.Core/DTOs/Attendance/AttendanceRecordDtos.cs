namespace SmartEPR.Core.DTOs.Attendance;

public sealed class AttendanceRecordDto
{
    public long AttendanceID { get; init; }
    public long OrgID { get; init; }
    public long UserID { get; init; }
    public string? UserName { get; init; }
    public string? EmployeeCode { get; init; }
    public DateTime AttendanceDate { get; init; }
    public DateTime? CheckInTime { get; init; }
    public DateTime? CheckOutTime { get; init; }
    public double? CheckInLatitude { get; init; }
    public double? CheckInLongitude { get; init; }
    public double? CheckOutLatitude { get; init; }
    public double? CheckOutLongitude { get; init; }
    public string? CheckInPhotoPath { get; init; }
    public string? CheckOutPhotoPath { get; init; }
    public string? CheckInMethod { get; init; }
    public string? CheckOutMethod { get; init; }
    public string? OfficeName { get; init; }
    public bool CheckInConfirmed { get; init; } = true;
    public bool CheckOutConfirmed { get; init; } = true;
    public bool CheckInPendingConfirmation { get; init; }
    public bool CheckOutPendingConfirmation { get; init; }
    public decimal? TotalHours { get; init; }
    public decimal? NetHours { get; init; }
    public decimal? ShortfallHours { get; init; }
    public bool IsDayComplete { get; init; }
    public bool IsWorkingDay { get; init; }
    public bool HasCheckedOut { get; init; }
    public string TimingMode { get; init; } = "fixed";
}

public sealed class AttendanceRecordListSourceDto
{
    public long AttendanceID { get; init; }
    public long OrgID { get; init; }
    public long UserID { get; init; }
    public string? UserName { get; init; }
    public string? EmployeeCode { get; init; }
    public DateTime AttendanceDate { get; init; }
    public DateTime? CheckInTime { get; init; }
    public DateTime? CheckOutTime { get; init; }
    public double? CheckInLatitude { get; init; }
    public double? CheckInLongitude { get; init; }
    public double? CheckOutLatitude { get; init; }
    public double? CheckOutLongitude { get; init; }
    public string? CheckInPhotoPath { get; init; }
    public string? CheckOutPhotoPath { get; init; }
    public string? CheckInMethod { get; init; }
    public string? CheckOutMethod { get; init; }
    public string? OfficeName { get; init; }
    public bool CheckInConfirmed { get; init; }
    public bool CheckOutConfirmed { get; init; }
    public string? CheckInDeviceID { get; init; }
    public string? CheckOutDeviceID { get; init; }
    public long? AttendanceShiftID { get; init; }
    public string? WeeklyOffDays { get; init; }
    public string? SaturdayOffPattern { get; init; }
}
