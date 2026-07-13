using SmartEPR.Core.DTOs.Audit;

namespace SmartEPR.Core.DTOs.Ticket;

public sealed class TicketStatusOptionDto
{
    public long TicketStatusID { get; init; }
    public string StatusName { get; init; } = string.Empty;
    public string StatusNameMr { get; init; } = string.Empty;
    public int SortOrder { get; init; }
}

public sealed class TicketModuleOptionDto
{
    public long TicketModuleID { get; init; }
    public string ModuleName { get; init; } = string.Empty;
    public int SortOrder { get; init; }
}

public sealed class TicketListItemDto
{
    public long TicketID { get; init; }
    public string? TicketNo { get; init; }
    public long OrgID { get; init; }
    public DateTime TicketDate { get; init; }
    public string? Subject { get; init; }
    public string? Description { get; init; }
    public string? Module { get; init; }
    public string? Priority { get; init; }
    public string? ReplyRequired { get; init; }
    public long TicketStatusID { get; init; }
    public string? Attachment { get; init; }
    public long UserID { get; init; }
    public DateTime CreatedDate { get; init; }
    public DateTime? ModifyDate { get; init; }
    public DateTime? SubmittedDate { get; init; }
    public DateTime? SentDate { get; init; }
    public DateTime? ReadDate { get; init; }
    public DateTime? LastReplyDate { get; init; }
    public DateTime? ClosedDate { get; init; }
    public long? ClosedByUserID { get; init; }
    public string? IP { get; init; }
    public string? OrganizationName { get; init; }
    public string? SchoolNames { get; init; }
    public string? OrgIDs { get; init; }
    public string? StatusName { get; init; }
    public string? StatusNameMr { get; init; }
    public string? UserCode { get; init; }
}

public sealed class TicketReplyDto
{
    public long ReplyID { get; init; }
    public long TicketID { get; init; }
    public string ReplyText { get; init; } = string.Empty;
    public string? ReplyStatus { get; init; }
    public long UserID { get; init; }
    public DateTime ReplyDate { get; init; }
    public string? Attachment { get; init; }
    public string? UserCode { get; init; }
}

public sealed class TicketDetailDto
{
    public TicketListItemDto Ticket { get; init; } = new();
    public IReadOnlyList<TicketReplyDto> Replies { get; init; } = [];
    public bool CanEdit { get; init; }
    public bool CanReply { get; init; }
    public bool CanClose { get; init; }
}

public sealed class SaveTicketRequestDto
{
    public long? TicketID { get; init; }
    public IReadOnlyList<long> OrgIDs { get; init; } = [];
    public DateTime TicketDate { get; init; }
    public string? Subject { get; init; }
    public string? Description { get; init; }
    public string? Module { get; init; }
    public string? Priority { get; init; }
    public string? ReplyRequired { get; init; }
    public string? Attachment { get; init; }
}

public sealed class SaveTicketReplyRequestDto
{
    public long TicketID { get; init; }
    public string ReplyText { get; init; } = string.Empty;
    public string? ReplyStatus { get; init; }
    public string? Attachment { get; init; }
}

public sealed class TicketPendingNotificationDto
{
    public long TicketID { get; init; }
    public string? TicketNo { get; init; }
    public string? Subject { get; init; }
    public string? Description { get; init; }
    public string? Module { get; init; }
    public string? Priority { get; init; }
    public string? ReplyRequired { get; init; }
    public long TicketStatusID { get; init; }
    public long CreatedByUserID { get; init; }
    public DateTime? SubmittedDate { get; init; }
    public DateTime? SentDate { get; init; }
    public string? StatusName { get; init; }
    public string? StatusNameMr { get; init; }
    public string? SchoolNames { get; init; }
}

public sealed class TicketLookupsDto
{
    public IReadOnlyList<OrgOptionDto> Orgs { get; init; } = [];
    public IReadOnlyList<TicketStatusOptionDto> Statuses { get; init; } = [];
    public IReadOnlyList<TicketModuleOptionDto> Modules { get; init; } = [];
    public IReadOnlyList<string> Priorities { get; init; } = ["Low", "Medium", "High", "Critical"];
    public IReadOnlyList<string> ReplyRequiredOptions { get; init; } = ["Instant", "Later"];
    public bool IsSansthaUser { get; init; }
    public bool CanRaiseTicket { get; init; }
    public long UserID { get; init; }
}

public sealed class TicketUserContextDto
{
    public bool IsSansthaUser { get; init; }
    public bool CanRaiseTicket { get; init; }
    public long UserID { get; init; }
}

public sealed class TicketNotificationPayloadDto
{
    public long TicketID { get; init; }
    public string? TicketNo { get; init; }
    public string? Subject { get; init; }
    public string? ReplyRequired { get; init; }
    public string? SchoolNames { get; init; }
    public IReadOnlyList<long> OrgIDs { get; init; } = [];
}
