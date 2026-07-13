using Microsoft.AspNetCore.SignalR;
using SmartEPR.Core.DTOs.Ticket;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Hubs;

public sealed class TicketHub : Hub
{
    public async Task JoinSchoolGroups(IReadOnlyList<long> orgIds)
    {
        foreach (var orgId in orgIds.Where(x => x > 0).Distinct())
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(orgId)).ConfigureAwait(false);
        }
    }

    public static string GroupName(long orgId) => $"school_{orgId}";
}

public sealed class TicketNotificationService : ITicketNotificationService
{
    private readonly IHubContext<TicketHub> _hubContext;

    public TicketNotificationService(IHubContext<TicketHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task NotifyTicketCreatedAsync(TicketNotificationPayloadDto payload, CancellationToken cancellationToken = default)
    {
        var tasks = payload.OrgIDs
            .Where(x => x > 0)
            .Distinct()
            .Select(orgId => _hubContext.Clients.Group(TicketHub.GroupName(orgId)).SendAsync("TicketCreated", payload, cancellationToken));

        return Task.WhenAll(tasks);
    }
}
