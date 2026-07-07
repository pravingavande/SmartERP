using SmartEPR.Core.DTOs.Ticket;

namespace SmartEPR.Core.Interfaces;

public interface ITicketRepository
{
    Task<TicketUserContextDto> GetUserContextAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketStatusOptionDto>> GetStatusesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketListItemDto>> GetListAsync(long? orgId, long? userId, CancellationToken cancellationToken = default);
    Task<TicketListItemDto?> GetByIdAsync(long ticketId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(long userId, string? ipAddress, SaveTicketRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long ticketId, CancellationToken cancellationToken = default);
}

public interface ITicketService
{
    Task<TicketLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TicketListItemDto>> GetListAsync(long userId, long? orgId, CancellationToken cancellationToken = default);
    Task<TicketListItemDto?> GetByIdAsync(long ticketId, CancellationToken cancellationToken = default);
    Task<TicketListItemDto?> SaveAsync(long userId, string? ipAddress, SaveTicketRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long ticketId, CancellationToken cancellationToken = default);
}
