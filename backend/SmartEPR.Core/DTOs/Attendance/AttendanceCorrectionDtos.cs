using System.Text.Json.Serialization;

namespace SmartEPR.Core.DTOs.Attendance;

public sealed class ReverseAttendanceCorrectionRequestDto
{
    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("attendanceID")]
    public long AttendanceID { get; set; }

    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = "check_in";

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

public sealed class ForceCheckoutAttendanceRequestDto
{
    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("attendanceID")]
    public long AttendanceID { get; set; }

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;

    [JsonPropertyName("checkoutAt")]
    public DateTime? CheckoutAt { get; set; }
}

public sealed class AttendanceCorrectionResultDto
{
    public long AttendanceID { get; init; }
    public bool Success { get; init; } = true;
    public AttendanceRecordDto? Record { get; init; }
}
