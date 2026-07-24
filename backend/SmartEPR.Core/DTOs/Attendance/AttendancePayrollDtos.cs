namespace SmartEPR.Core.DTOs.Attendance;

public sealed class AttendancePayrollRowDto
{
    public long EmployeeID { get; init; }
    public string EmployeeName { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public string ShiftName { get; init; } = "General";
    public string WeeklyOffSchedule { get; init; } = string.Empty;
    public string SaturdayOffPattern { get; init; } = "none";
    public string SaturdayOffLabel { get; init; } = string.Empty;
    public string Currency { get; init; } = "INR";
    public string CurrencySymbol { get; init; } = "₹";
    public bool IsCurrentMonth { get; init; }
    public bool SalaryConfigured { get; init; }
    public int Year { get; init; }
    public int Month { get; init; }
    public string MonthLabel { get; init; } = string.Empty;
    public int WorkingDaysInMonth { get; init; }
    public int WeeklyOffDays { get; init; }
    public int PresentDays { get; init; }
    public int LeaveDays { get; init; }
    public int AbsentDays { get; init; }
    public int PendingDays { get; init; }
    public int DaysElapsedInMonth { get; init; }
    public decimal MonthlySalary { get; init; }
    public decimal PerDayRate { get; init; }
    public decimal EarnedSoFar { get; init; }
    public decimal DeductionForAbsences { get; init; }
    public decimal ProjectedNetSalary { get; init; }
    public decimal MaxPossibleRemaining { get; init; }
    public decimal PayableSalary { get; init; }
    public int PaidDays { get; init; }
}

public sealed class AttendancePayrollEmployeeSourceDto
{
    public long UserID { get; init; }
    public string EmployeeName { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public decimal? MonthlySalary { get; init; }
    public long? AttendanceShiftID { get; init; }
    public string? WeeklyOffDays { get; init; }
    public string? SaturdayOffPattern { get; init; }
}

public sealed class AttendancePayrollPresentDateDto
{
    public long UserID { get; init; }
    public DateTime AttendanceDate { get; init; }
}

public sealed class AttendancePayrollApprovedLeaveDto
{
    public long UserID { get; init; }
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
}
