using System.Text.Json.Serialization;

namespace SmartEPR.Core.DTOs.Attendance;

public sealed class AttendanceShiftDto
{
    public long ShiftID { get; init; }
    public long OrgID { get; init; }
    public string ShiftName { get; init; } = string.Empty;
    public string ShiftCode { get; init; } = string.Empty;
    public string StartTime { get; init; } = string.Empty;
    public string EndTime { get; init; } = string.Empty;
    public int GraceMinutes { get; init; }
    public int EarlyCheckinMinutes { get; init; }
    public bool IsNightShift { get; init; }
    public string WorkingDays { get; init; } = "1111100";
    public bool IsActive { get; init; } = true;
    public string TimingMode { get; init; } = "fixed";
    public int? RequiredWorkMinutes { get; init; }
    public int LunchMinutes { get; init; } = 60;
    public string? FlexWindowStart { get; init; }
    public string? FlexWindowEnd { get; init; }
}

public sealed class SaveAttendanceShiftRequestDto
{
    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("shiftName")]
    public string ShiftName { get; set; } = string.Empty;

    [JsonPropertyName("shiftCode")]
    public string ShiftCode { get; set; } = string.Empty;

    [JsonPropertyName("startTime")]
    public string StartTime { get; set; } = "09:00";

    [JsonPropertyName("endTime")]
    public string EndTime { get; set; } = "18:00";

    [JsonPropertyName("graceMinutes")]
    public int GraceMinutes { get; set; } = 15;

    [JsonPropertyName("earlyCheckinMinutes")]
    public int EarlyCheckinMinutes { get; set; } = 60;

    [JsonPropertyName("isNightShift")]
    public bool IsNightShift { get; set; }

    [JsonPropertyName("workingDays")]
    public string WorkingDays { get; set; } = "1111100";

    [JsonPropertyName("timingMode")]
    public string TimingMode { get; set; } = "fixed";

    [JsonPropertyName("requiredWorkMinutes")]
    public int? RequiredWorkMinutes { get; set; } = 480;

    [JsonPropertyName("lunchMinutes")]
    public int LunchMinutes { get; set; } = 60;

    [JsonPropertyName("flexWindowStart")]
    public string? FlexWindowStart { get; set; }

    [JsonPropertyName("flexWindowEnd")]
    public string? FlexWindowEnd { get; set; }
}

public sealed class UpdateAttendanceShiftRequestDto
{
    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("shiftName")]
    public string? ShiftName { get; set; }

    [JsonPropertyName("shiftCode")]
    public string? ShiftCode { get; set; }

    [JsonPropertyName("startTime")]
    public string? StartTime { get; set; }

    [JsonPropertyName("endTime")]
    public string? EndTime { get; set; }

    [JsonPropertyName("graceMinutes")]
    public int? GraceMinutes { get; set; }

    [JsonPropertyName("earlyCheckinMinutes")]
    public int? EarlyCheckinMinutes { get; set; }

    [JsonPropertyName("isNightShift")]
    public bool? IsNightShift { get; set; }

    [JsonPropertyName("workingDays")]
    public string? WorkingDays { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("timingMode")]
    public string? TimingMode { get; set; }

    [JsonPropertyName("requiredWorkMinutes")]
    public int? RequiredWorkMinutes { get; set; }

    [JsonPropertyName("lunchMinutes")]
    public int? LunchMinutes { get; set; }

    [JsonPropertyName("flexWindowStart")]
    public string? FlexWindowStart { get; set; }

    [JsonPropertyName("flexWindowEnd")]
    public string? FlexWindowEnd { get; set; }
}
