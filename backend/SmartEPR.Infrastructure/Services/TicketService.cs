using SmartEPR.Core.DTOs.Ticket;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class TicketService : ITicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly IAuditVoucherRepository _auditRepository;

    public TicketService(ITicketRepository ticketRepository, IAuditVoucherRepository auditRepository)
    {
        _ticketRepository = ticketRepository;
        _auditRepository = auditRepository;
    }

    public async Task<TicketLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var orgs = await _auditRepository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        var statuses = await _ticketRepository.GetStatusesAsync(cancellationToken).ConfigureAwait(false);
        var context = await _ticketRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);

        return new TicketLookupsDto
        {
            Orgs = orgs,
            Statuses = statuses,
            IsSansthaUser = context.IsSansthaUser
        };
    }

    public Task<IReadOnlyList<TicketListItemDto>> GetListAsync(long userId, long? orgId, CancellationToken cancellationToken = default)
        => _ticketRepository.GetListAsync(orgId, userId, cancellationToken);

    public Task<TicketListItemDto?> GetByIdAsync(long ticketId, CancellationToken cancellationToken = default)
        => _ticketRepository.GetByIdAsync(ticketId, cancellationToken);

    public async Task<TicketListItemDto?> SaveAsync(long userId, string? ipAddress, SaveTicketRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request.OrgID <= 0 || request.TicketStatusID <= 0)
            return null;

        var ticketId = await _ticketRepository.SaveAsync(userId, ipAddress, request, cancellationToken).ConfigureAwait(false);
        return await _ticketRepository.GetByIdAsync(ticketId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> DeleteAsync(long ticketId, CancellationToken cancellationToken = default)
    {
        await _ticketRepository.DeleteAsync(ticketId, cancellationToken).ConfigureAwait(false);
        return true;
    }
}
