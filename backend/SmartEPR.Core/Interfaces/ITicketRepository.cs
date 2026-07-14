using SmartEPR.Core.DTOs.Ticket;

namespace SmartEPR.Core.Interfaces;

public interface ITicketRepository
{
    Task<TicketUserContextDto> GetUserContextAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketStatusOptionDto>> GetStatusesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketModuleOptionDto>> GetModulesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketListItemDto>> GetListAsync(long? orgId, long? userId, CancellationToken cancellationToken = default);
    Task<TicketListItemDto?> GetByIdAsync(long ticketId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketReplyDto>> GetRepliesAsync(long ticketId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketPendingNotificationDto>> GetPendingNotificationsAsync(long userId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(long userId, string? ipAddress, SaveTicketRequestDto request, CancellationToken cancellationToken = default);
    Task<long> AddReplyAsync(long userId, string? ipAddress, SaveTicketReplyRequestDto request, CancellationToken cancellationToken = default);
    Task MarkReadAsync(long ticketId, long userId, CancellationToken cancellationToken = default);
    Task AcknowledgeAsync(long ticketId, long userId, string? ipAddress, CancellationToken cancellationToken = default);
    Task CloseAsync(long ticketId, long userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(long ticketId, CancellationToken cancellationToken = default);
}

public interface ITicketService
{
    Task<TicketLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketListItemDto>> GetListAsync(long userId, long? orgId, CancellationToken cancellationToken = default);
    Task<TicketDetailDto?> GetDetailAsync(long ticketId, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketPendingNotificationDto>> GetPendingNotificationsAsync(long userId, CancellationToken cancellationToken = default);
    Task<TicketDetailDto?> SaveAsync(long userId, string? ipAddress, SaveTicketRequestDto request, CancellationToken cancellationToken = default);
    Task<TicketDetailDto?> AddReplyAsync(long userId, string? ipAddress, SaveTicketReplyRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> CloseAsync(long ticketId, long userId, CancellationToken cancellationToken = default);
    Task<bool> AcknowledgeAsync(long ticketId, long userId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long ticketId, long userId, CancellationToken cancellationToken = default);
}

public interface ITicketNotificationService
{
    Task NotifyTicketCreatedAsync(TicketNotificationPayloadDto payload, CancellationToken cancellationToken = default);
}
