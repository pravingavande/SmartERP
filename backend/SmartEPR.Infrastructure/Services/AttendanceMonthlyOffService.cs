using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Attendance;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Attendance;

namespace SmartEPR.Infrastructure.Services;

public sealed class AttendanceMonthlyOffService : IAttendanceMonthlyOffService
{
    private readonly IAttendanceMonthlyOffRepository _repository;
    private readonly IAttendanceShiftRepository _shiftRepository;

    public AttendanceMonthlyOffService(
        IAttendanceMonthlyOffRepository repository,
        IAttendanceShiftRepository shiftRepository)
    {
        _repository = repository;
        _shiftRepository = shiftRepository;
    }

    public async Task<AttendanceMonthlyOffPlanDto> GetPlanAsync(long orgId, int year, int month, CancellationToken cancellationToken = default)
    {
        if (orgId <= 0)
            throw new ArgumentException("Organization is required.", nameof(orgId));

        var (resolvedYear, resolvedMonth) = ResolveYearMonth(year, month);
        var dates = AttendanceWeeklyOffHelper.ListDatesInMonth(resolvedYear, resolvedMonth);
        if (dates.Count == 0)
            throw new ArgumentException("Invalid month.");

        var fromDate = DateTime.Parse(dates[0]);
        var toDate = DateTime.Parse(dates[^1]);

        var employeesTask = _repository.GetEmployeesAsync(orgId, cancellationToken);
        var shiftsTask = _shiftRepository.GetListAsync(orgId, cancellationToken);
        var overridesTask = _repository.GetOverridesAsync(orgId, fromDate, toDate, cancellationToken);

        await Task.WhenAll(employeesTask, shiftsTask, overridesTask).ConfigureAwait(false);

        var employees = await employeesTask.ConfigureAwait(false);
        var shifts = await shiftsTask.ConfigureAwait(false);
        var overrides = await overridesTask.ConfigureAwait(false);

        var shiftById = shifts.ToDictionary(s => s.ShiftID);
        var defaultShift = shifts.FirstOrDefault(s => s.IsActive && s.ShiftCode == "GENERAL")
            ?? shifts.FirstOrDefault(s => s.IsActive);

        var overrideMap = overrides.ToDictionary(
            o => $"{o.UserID}|{o.WorkDate:yyyy-MM-dd}",
            o => o.IsOff);

        var dayHeaders = dates.Select(dateStr =>
        {
            var dateObj = AttendanceWeeklyOffHelper.ParseIstDate(dateStr);
            var dow = AttendanceWeeklyOffHelper.DayOfWeekIst(dateObj);
            return new AttendanceMonthlyOffDayHeaderDto
            {
                Date = dateStr,
                Day = int.Parse(dateStr.AsSpan(8, 2)),
                Weekday = AttendanceWeeklyOffHelper.WeekdayLabel(dateObj),
                IsSunday = dow == 0
            };
        }).ToList();

        var employeeRows = employees.Select(emp =>
        {
            var shift = emp.AttendanceShiftID is > 0 && shiftById.TryGetValue(emp.AttendanceShiftID.Value, out var assigned)
                ? assigned
                : defaultShift;
            var shiftWorkingDays = shift?.WorkingDays ?? "1111100";

            var days = dates.Select(dateStr =>
            {
                var dateObj = AttendanceWeeklyOffHelper.ParseIstDate(dateStr);
                var defaultOff = !AttendanceWeeklyOffHelper.IsEmployeeWorkingDay(
                    dateObj,
                    emp.WeeklyOffDays,
                    emp.SaturdayOffPattern,
                    shiftWorkingDays);

                var key = $"{emp.UserID}|{dateStr}";
                var hasOverride = overrideMap.TryGetValue(key, out var isOff);
                string? overrideValue = hasOverride ? (isOff ? "off" : "working") : null;
                var effectiveOff = hasOverride ? isOff : defaultOff;

                return new AttendanceMonthlyOffDayCellDto
                {
                    Date = dateStr,
                    DefaultOff = defaultOff,
                    EffectiveOff = effectiveOff,
                    Override = overrideValue
                };
            }).ToList();

            return new AttendanceMonthlyOffEmployeeRowDto
            {
                UserID = emp.UserID,
                Name = emp.EmployeeName,
                EmployeeCode = emp.EmployeeCode,
                Days = days
            };
        }).ToList();

        return new AttendanceMonthlyOffPlanDto
        {
            Year = resolvedYear,
            Month = resolvedMonth,
            MonthLabel = AttendanceWeeklyOffHelper.MonthLabel(resolvedYear, resolvedMonth),
            DayHeaders = dayHeaders,
            Employees = employeeRows
        };
    }

    public async Task<(AttendanceMonthlyOffSaveResultDto? Data, string? Error)> SaveChangesAsync(
        SaveAttendanceMonthlyOffRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.OrgID <= 0)
            return (null, "Organization is required.");

        var dates = AttendanceWeeklyOffHelper.ListDatesInMonth(request.Year, request.Month);
        if (dates.Count == 0)
            return (null, "Invalid month.");

        if (request.Changes.Count == 0)
            return (new AttendanceMonthlyOffSaveResultDto { Updated = 0 }, null);

        var validDates = dates.ToHashSet(StringComparer.Ordinal);
        var employees = await _repository.GetEmployeesAsync(request.OrgID, cancellationToken).ConfigureAwait(false);
        var employeeIds = employees.Select(e => e.UserID).ToHashSet();

        var updated = 0;
        try
        {
            foreach (var change in request.Changes)
            {
                if (!employeeIds.Contains(change.UserID))
                    return (null, "Invalid employee for this organization.");

                if (!validDates.Contains(change.Date))
                    return (null, $"Date {change.Date} is outside the selected month.");

                var overrideType = NormalizeOverride(change.Override);
                await _repository.SetOverrideAsync(
                    request.OrgID,
                    change.UserID,
                    DateTime.Parse(change.Date),
                    overrideType,
                    cancellationToken).ConfigureAwait(false);
                updated++;
            }

            return (new AttendanceMonthlyOffSaveResultDto { Updated = updated }, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    private static (int Year, int Month) ResolveYearMonth(int year, int month)
    {
        if (year is >= 2000 and <= 2100 && month is >= 1 and <= 12)
            return (year, month);

        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"));
        return (now.Year, now.Month);
    }

    private static string NormalizeOverride(string? value)
    {
        var normalized = (value ?? "default").Trim().ToLowerInvariant();
        return normalized switch
        {
            "off" => "off",
            "working" => "working",
            _ => "default"
        };
    }
}
