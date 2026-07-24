namespace SmartEPR.Core.DTOs.Attendance;

public sealed class AttendanceMonthlyOffDayHeaderDto
{
    public string Date { get; init; } = string.Empty;
    public int Day { get; init; }
    public string Weekday { get; init; } = string.Empty;
    public bool IsSunday { get; init; }
}

public sealed class AttendanceMonthlyOffDayCellDto
{
    public string Date { get; init; } = string.Empty;
    public bool DefaultOff { get; init; }
    public bool EffectiveOff { get; init; }
    public string? Override { get; init; }
}

public sealed class AttendanceMonthlyOffEmployeeRowDto
{
    public long UserID { get; init; }
    public string Name { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public IReadOnlyList<AttendanceMonthlyOffDayCellDto> Days { get; init; } = [];
}

public sealed class AttendanceMonthlyOffPlanDto
{
    public int Year { get; init; }
    public int Month { get; init; }
    public string MonthLabel { get; init; } = string.Empty;
    public IReadOnlyList<AttendanceMonthlyOffDayHeaderDto> DayHeaders { get; init; } = [];
    public IReadOnlyList<AttendanceMonthlyOffEmployeeRowDto> Employees { get; init; } = [];
}

public sealed class AttendanceMonthlyOffChangeDto
{
    public long UserID { get; init; }
    public string Date { get; init; } = string.Empty;
    public string Override { get; init; } = "default";
}

public sealed class SaveAttendanceMonthlyOffRequestDto
{
    public long OrgID { get; init; }
    public int Year { get; init; }
    public int Month { get; init; }
    public IReadOnlyList<AttendanceMonthlyOffChangeDto> Changes { get; init; } = [];
}

public sealed class AttendanceMonthlyOffSaveResultDto
{
    public int Updated { get; init; }
}

public sealed class AttendanceMonthlyOffEmployeeSourceDto
{
    public long UserID { get; init; }
    public string EmployeeName { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public long? AttendanceShiftID { get; init; }
    public string? WeeklyOffDays { get; init; }
    public string? SaturdayOffPattern { get; init; }
}

public sealed class AttendanceMonthlyOffOverrideRowDto
{
    public long UserID { get; init; }
    public DateTime WorkDate { get; init; }
    public bool IsOff { get; init; }
}
