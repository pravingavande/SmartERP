using SmartEPR.Core.DTOs.Ticket;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class TicketService : ITicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly IAuditVoucherRepository _auditRepository;
    private readonly ITicketNotificationService _notificationService;

    public TicketService(
        ITicketRepository ticketRepository,
        IAuditVoucherRepository auditRepository,
        ITicketNotificationService notificationService)
    {
        _ticketRepository = ticketRepository;
        _auditRepository = auditRepository;
        _notificationService = notificationService;
    }

    public async Task<TicketLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var orgs = await _auditRepository.GetUserOrgsAsync(userId, cancellationToken).ConfigureAwait(false);
        var statuses = await _ticketRepository.GetStatusesAsync(cancellationToken).ConfigureAwait(false);
        var modules = await _ticketRepository.GetModulesAsync(cancellationToken).ConfigureAwait(false);
        var context = await _ticketRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);

        return new TicketLookupsDto
        {
            Orgs = orgs,
            Statuses = statuses,
            Modules = modules,
            IsSansthaUser = context.IsSansthaUser,
            CanRaiseTicket = context.CanRaiseTicket,
            UserID = context.UserID
        };
    }

    public Task<IReadOnlyList<TicketListItemDto>> GetListAsync(long userId, long? orgId, CancellationToken cancellationToken = default)
        => _ticketRepository.GetListAsync(orgId, userId, cancellationToken);

    public async Task<TicketDetailDto?> GetDetailAsync(long ticketId, long userId, CancellationToken cancellationToken = default)
    {
        var ticket = await _ticketRepository.GetByIdAsync(ticketId, cancellationToken).ConfigureAwait(false);
        if (ticket is null) return null;

        await _ticketRepository.MarkReadAsync(ticketId, userId, cancellationToken).ConfigureAwait(false);

        var replies = await _ticketRepository.GetRepliesAsync(ticketId, cancellationToken).ConfigureAwait(false);
        var context = await _ticketRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        var isClosed = string.Equals(ticket.StatusName, "Closed", StringComparison.OrdinalIgnoreCase);
        var isCreator = ticket.UserID == userId;

        return new TicketDetailDto
        {
            Ticket = ticket,
            Replies = replies,
            CanEdit = context.CanRaiseTicket && isCreator && !isClosed,
            CanReply = !isClosed,
            CanClose = isCreator && !isClosed
        };
    }

    public Task<IReadOnlyList<TicketPendingNotificationDto>> GetPendingNotificationsAsync(long userId, CancellationToken cancellationToken = default)
        => _ticketRepository.GetPendingNotificationsAsync(userId, cancellationToken);

    public async Task<TicketDetailDto?> SaveAsync(long userId, string? ipAddress, SaveTicketRequestDto request, CancellationToken cancellationToken = default)
    {
        var context = await _ticketRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (!context.CanRaiseTicket)
            return null;

        if (request.OrgIDs is null || request.OrgIDs.Count == 0)
            return null;

        if (string.IsNullOrWhiteSpace(request.Subject))
            return null;

        if (string.IsNullOrWhiteSpace(request.ReplyRequired))
            return null;

        var isNew = request.TicketID is null or <= 0;
        var ticketId = await _ticketRepository.SaveAsync(userId, ipAddress, request, cancellationToken).ConfigureAwait(false);

        if (isNew)
        {
            var saved = await _ticketRepository.GetByIdAsync(ticketId, cancellationToken).ConfigureAwait(false);
            if (saved is not null)
            {
                await _notificationService.NotifyTicketCreatedAsync(new TicketNotificationPayloadDto
                {
                    TicketID = saved.TicketID,
                    TicketNo = saved.TicketNo,
                    Subject = saved.Subject,
                    ReplyRequired = saved.ReplyRequired,
                    SchoolNames = saved.SchoolNames,
                    OrgIDs = ParseOrgIds(saved.OrgIDs)
                }, cancellationToken).ConfigureAwait(false);
            }
        }

        return await GetDetailAsync(ticketId, userId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<TicketDetailDto?> AddReplyAsync(long userId, string? ipAddress, SaveTicketReplyRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request.TicketID <= 0 || string.IsNullOrWhiteSpace(request.ReplyText))
            return null;

        await _ticketRepository.AddReplyAsync(userId, ipAddress, request, cancellationToken).ConfigureAwait(false);
        return await GetDetailAsync(request.TicketID, userId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> CloseAsync(long ticketId, long userId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _ticketRepository.CloseAsync(ticketId, userId, cancellationToken).ConfigureAwait(false);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> DeleteAsync(long ticketId, long userId, CancellationToken cancellationToken = default)
    {
        var context = await _ticketRepository.GetUserContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (!context.CanRaiseTicket)
            return false;

        await _ticketRepository.DeleteAsync(ticketId, cancellationToken).ConfigureAwait(false);
        return true;
    }

    private static IReadOnlyList<long> ParseOrgIds(string? orgIds)
    {
        if (string.IsNullOrWhiteSpace(orgIds)) return [];
        return orgIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => long.TryParse(x, out var id) ? id : 0)
            .Where(x => x > 0)
            .ToList();
    }
}
