using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Attendance;

namespace SmartEPR.Infrastructure.Services;

public sealed class AttendancePayrollService : IAttendancePayrollService
{
    private readonly IAttendancePayrollRepository _payrollRepository;
    private readonly IAttendanceShiftRepository _shiftRepository;
    private readonly IAttendanceMonthlyOffRepository _monthlyOffRepository;

    public AttendancePayrollService(
        IAttendancePayrollRepository payrollRepository,
        IAttendanceShiftRepository shiftRepository,
        IAttendanceMonthlyOffRepository monthlyOffRepository)
    {
        _payrollRepository = payrollRepository;
        _shiftRepository = shiftRepository;
        _monthlyOffRepository = monthlyOffRepository;
    }

    public async Task<IReadOnlyList<AttendancePayrollRowDto>> GetTeamPayrollAsync(
        long orgId,
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        if (orgId <= 0)
            return [];

        var context = await LoadPayrollContextAsync(orgId, year, month, cancellationToken).ConfigureAwait(false);
        return context.Employees
            .Select(emp => ComputeRow(emp, context))
            .ToList();
    }

    public Task<AttendancePayrollRowDto?> GetEmployeePayrollAsync(
        long orgId,
        long userId,
        int year,
        int month,
        CancellationToken cancellationToken = default)
        => GetSinglePayrollAsync(orgId, userId, year, month, cancellationToken);

    public Task<AttendancePayrollRowDto?> GetMyPayrollAsync(
        long orgId,
        long userId,
        int year,
        int month,
        CancellationToken cancellationToken = default)
        => GetSinglePayrollAsync(orgId, userId, year, month, cancellationToken);

    private async Task<AttendancePayrollRowDto?> GetSinglePayrollAsync(
        long orgId,
        long userId,
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        if (orgId <= 0 || userId <= 0)
            return null;

        var context = await LoadPayrollContextAsync(orgId, year, month, cancellationToken).ConfigureAwait(false);
        var employee = context.Employees.FirstOrDefault(e => e.UserID == userId);
        return employee is null ? null : ComputeRow(employee, context);
    }

    private async Task<PayrollContext> LoadPayrollContextAsync(
        long orgId,
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        var (resolvedYear, resolvedMonth) = AttendancePayrollHelper.ParseYearMonth(year, month);
        var dates = AttendanceWeeklyOffHelper.ListDatesInMonth(resolvedYear, resolvedMonth);
        var fromDate = DateTime.Parse(dates[0]);
        var toDate = DateTime.Parse(dates[^1]);

        var employeesTask = _payrollRepository.GetEmployeesAsync(orgId, cancellationToken);
        var shiftsTask = _shiftRepository.GetListAsync(orgId, cancellationToken);
        var presentTask = _payrollRepository.GetPresentDatesAsync(orgId, fromDate, toDate, cancellationToken);
        var leavesTask = _payrollRepository.GetApprovedLeavesAsync(orgId, fromDate, toDate, cancellationToken);
        var overridesTask = _monthlyOffRepository.GetOverridesAsync(orgId, fromDate, toDate, cancellationToken);

        await Task.WhenAll(employeesTask, shiftsTask, presentTask, leavesTask, overridesTask).ConfigureAwait(false);

        var shifts = await shiftsTask.ConfigureAwait(false);
        var shiftById = shifts.ToDictionary(s => s.ShiftID);
        var defaultShift = shifts.FirstOrDefault(s => s.IsActive && s.ShiftCode == "GENERAL")
            ?? shifts.FirstOrDefault(s => s.IsActive);

        var presentByUser = (await presentTask.ConfigureAwait(false))
            .GroupBy(p => p.UserID)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlySet<string>)g.Select(x => x.AttendanceDate.ToString("yyyy-MM-dd")).ToHashSet(StringComparer.Ordinal));

        var leavesByUser = (await leavesTask.ConfigureAwait(false))
            .GroupBy(l => l.UserID)
            .ToDictionary(g => g.Key, g => g.ToList());

        var overrideMap = (await overridesTask.ConfigureAwait(false))
            .ToDictionary(o => $"{o.UserID}|{o.WorkDate:yyyy-MM-dd}", o => o.IsOff);

        return new PayrollContext(
            resolvedYear,
            resolvedMonth,
            dates[0],
            dates[^1],
            await employeesTask.ConfigureAwait(false),
            shiftById,
            defaultShift,
            presentByUser,
            leavesByUser,
            overrideMap);
    }

    private static AttendancePayrollRowDto ComputeRow(AttendancePayrollEmployeeSourceDto employee, PayrollContext context)
    {
        var shift = employee.AttendanceShiftID is > 0 && context.ShiftById.TryGetValue(employee.AttendanceShiftID.Value, out var assigned)
            ? assigned
            : context.DefaultShift;
        var shiftWorkingDays = shift?.WorkingDays ?? "1111100";
        var effectiveWeeklyOff = AttendanceWeeklyOffHelper.EffectiveWeeklyOffDays(employee.WeeklyOffDays, shiftWorkingDays);

        var presentDates = context.PresentByUser.TryGetValue(employee.UserID, out var present)
            ? present
            : new HashSet<string>(StringComparer.Ordinal);

        var userLeaves = context.LeavesByUser.TryGetValue(employee.UserID, out var leaves)
            ? leaves
            : [];
        var approvedLeaveDates = AttendancePayrollHelper.ExpandLeaveDates(userLeaves, context.FromDate, context.ToDate);

        bool IsWorkingDay(string dateStr, DateTime dateObj)
        {
            var key = $"{employee.UserID}|{dateStr}";
            if (context.OverrideMap.TryGetValue(key, out var forcedOff))
                return !forcedOff;

            return AttendanceWeeklyOffHelper.IsEmployeeWorkingDay(
                dateObj,
                employee.WeeklyOffDays,
                employee.SaturdayOffPattern,
                shiftWorkingDays);
        }

        var counts = AttendancePayrollHelper.ComputeDayCounts(
            context.Year,
            context.Month,
            IsWorkingDay,
            presentDates,
            approvedLeaveDates);

        var monthlySalary = employee.MonthlySalary ?? 0;
        var amounts = AttendancePayrollHelper.ComputeAmounts(monthlySalary, counts);
        var today = AttendancePayrollHelper.TodayIst();
        var isCurrentMonth = context.Year == int.Parse(today[..4]) && context.Month == int.Parse(today[5..7]);

        var weeklyOffSchedule = !string.IsNullOrWhiteSpace(employee.WeeklyOffDays)
            ? AttendancePayrollHelper.WeeklyOffDaysLabel(effectiveWeeklyOff)
            : $"Shift default ({AttendancePayrollHelper.WeeklyOffDaysLabel(shiftWorkingDays)})";

        return new AttendancePayrollRowDto
        {
            EmployeeID = employee.UserID,
            EmployeeName = employee.EmployeeName,
            EmployeeCode = employee.EmployeeCode,
            ShiftName = shift?.ShiftName ?? "General",
            WeeklyOffSchedule = weeklyOffSchedule,
            SaturdayOffPattern = employee.SaturdayOffPattern ?? "none",
            SaturdayOffLabel = AttendancePayrollHelper.SaturdayOffPatternLabel(employee.SaturdayOffPattern),
            IsCurrentMonth = isCurrentMonth,
            SalaryConfigured = monthlySalary > 0,
            Year = counts.Year,
            Month = counts.Month,
            MonthLabel = counts.MonthLabel,
            WorkingDaysInMonth = counts.WorkingDaysInMonth,
            WeeklyOffDays = counts.WeeklyOffDays,
            PresentDays = counts.PresentDays,
            LeaveDays = counts.LeaveDays,
            AbsentDays = counts.AbsentDays,
            PendingDays = counts.PendingDays,
            DaysElapsedInMonth = counts.DaysElapsedInMonth,
            MonthlySalary = amounts.MonthlySalary,
            PerDayRate = amounts.PerDayRate,
            EarnedSoFar = amounts.EarnedSoFar,
            DeductionForAbsences = amounts.DeductionForAbsences,
            ProjectedNetSalary = amounts.ProjectedNetSalary,
            MaxPossibleRemaining = amounts.MaxPossibleRemaining,
            PayableSalary = amounts.PayableSalary,
            PaidDays = amounts.PaidDays
        };
    }

    private sealed record PayrollContext(
        int Year,
        int Month,
        string FromDate,
        string ToDate,
        IReadOnlyList<AttendancePayrollEmployeeSourceDto> Employees,
        IReadOnlyDictionary<long, AttendanceShiftDto> ShiftById,
        AttendanceShiftDto? DefaultShift,
        IReadOnlyDictionary<long, IReadOnlySet<string>> PresentByUser,
        IReadOnlyDictionary<long, List<AttendancePayrollApprovedLeaveDto>> LeavesByUser,
        IReadOnlyDictionary<string, bool> OverrideMap);
}
