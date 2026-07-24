using System.Text.Json.Serialization;

namespace SmartEPR.Core.DTOs.Attendance;

public sealed class AttendanceLeaveRequestDto
{
    public long LeaveRequestID { get; init; }
    public long OrgID { get; init; }
    public long UserID { get; init; }
    public string? UserName { get; init; }
    public string? EmployeeCode { get; init; }
    public string LeaveType { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public string? Reason { get; init; }
    public string Status { get; init; } = "pending";
    public long? ReviewedBy { get; init; }
    public DateTime? ReviewedAt { get; init; }
    public string? ReviewComment { get; init; }
    public DateTime? CreatedOn { get; init; }
}

public sealed class AttendanceLeaveRequestMyDto
{
    public long LeaveRequestID { get; init; }
    public long OrgID { get; init; }
    public long UserID { get; init; }
    public string LeaveType { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public string? Reason { get; init; }
    public string Status { get; init; } = "pending";
    public DateTime? ReviewedAt { get; init; }
    public string? ReviewComment { get; init; }
    public DateTime? CreatedOn { get; init; }
}

public sealed class ApplyAttendanceLeaveRequestDto
{
    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("startDate")]
    public string StartDate { get; set; } = string.Empty;

    [JsonPropertyName("endDate")]
    public string EndDate { get; set; } = string.Empty;

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public sealed class ReviewAttendanceLeaveRequestDto
{
    [JsonPropertyName("orgID")]
    public long OrgID { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }
}

public sealed class AttendanceLeaveRequestReviewResultDto
{
    public long LeaveRequestID { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime? ReviewedAt { get; init; }
    public string? ReviewComment { get; init; }
}
