using Dapper;
using SmartEPR.Core.DTOs.Ticket;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class TicketRepository : ITicketRepository
{
    private readonly StoredProcedureExecutor _executor;

    public TicketRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public async Task<TicketUserContextDto> GetUserContextAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        var row = await _executor.QuerySingleOrDefaultAsync<UserContextRow>("dbo.sp_Ticket_GetUserContext", p, cancellationToken).ConfigureAwait(false);
        return new TicketUserContextDto
        {
            IsSansthaUser = row?.IsSansthaUser ?? false,
            CanRaiseTicket = row?.CanRaiseTicket ?? false,
            UserID = row?.UserID ?? userId
        };
    }

    public Task<IReadOnlyList<TicketStatusOptionDto>> GetStatusesAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<TicketStatusOptionDto>("dbo.sp_Ticket_GetStatuses", null, cancellationToken);

    public Task<IReadOnlyList<TicketModuleOptionDto>> GetModulesAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<TicketModuleOptionDto>("dbo.sp_Ticket_GetModules", null, cancellationToken);

    public Task<IReadOnlyList<TicketListItemDto>> GetListAsync(long? orgId, long? userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@UserID", userId);
        return _executor.QueryListAsync<TicketListItemDto>("dbo.sp_Ticket_GetList", p, cancellationToken);
    }

    public Task<TicketListItemDto?> GetByIdAsync(long ticketId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@TicketID", ticketId);
        return _executor.QuerySingleOrDefaultAsync<TicketListItemDto>("dbo.sp_Ticket_GetById", p, cancellationToken);
    }

    public Task<IReadOnlyList<TicketReplyDto>> GetRepliesAsync(long ticketId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@TicketID", ticketId);
        return _executor.QueryListAsync<TicketReplyDto>("dbo.sp_Ticket_GetReplies", p, cancellationToken);
    }

    public Task<IReadOnlyList<TicketPendingNotificationDto>> GetPendingNotificationsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UserID", userId);
        return _executor.QueryListAsync<TicketPendingNotificationDto>("dbo.sp_Ticket_GetPendingNotifications", p, cancellationToken);
    }

    public async Task<long> SaveAsync(long userId, string? ipAddress, SaveTicketRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@TicketID", request.TicketID > 0 ? request.TicketID : null, dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@OrgIDs", string.Join(",", request.OrgIDs));
        p.Add("@TicketDate", request.TicketDate);
        p.Add("@Subject", request.Subject);
        p.Add("@Description", request.Description);
        p.Add("@Module", request.Module);
        p.Add("@Priority", request.Priority);
        p.Add("@ReplyRequired", request.ReplyRequired);
        p.Add("@TicketStatusID", null);
        p.Add("@Attachment", request.Attachment);
        p.Add("@UserID", userId);
        p.Add("@IP", ipAddress);

        await _executor.ExecuteAsync("dbo.sp_Ticket_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@TicketID");
    }

    public async Task<long> AddReplyAsync(long userId, string? ipAddress, SaveTicketReplyRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@TicketID", request.TicketID);
        p.Add("@ReplyText", request.ReplyText);
        p.Add("@ReplyStatus", request.ReplyStatus);
        p.Add("@Attachment", request.Attachment);
        p.Add("@UserID", userId);
        p.Add("@IP", ipAddress);

        var replyId = await _executor.QuerySingleOrDefaultAsync<long>("dbo.sp_Ticket_AddReply", p, cancellationToken).ConfigureAwait(false);
        return replyId;
    }

    public Task MarkReadAsync(long ticketId, long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@TicketID", ticketId);
        p.Add("@UserID", userId);
        return _executor.ExecuteAsync("dbo.sp_Ticket_MarkRead", p, cancellationToken);
    }

    public Task CloseAsync(long ticketId, long userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@TicketID", ticketId);
        p.Add("@UserID", userId);
        return _executor.ExecuteAsync("dbo.sp_Ticket_Close", p, cancellationToken);
    }

    public Task DeleteAsync(long ticketId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@TicketID", ticketId);
        return _executor.ExecuteAsync("dbo.sp_Ticket_Delete", p, cancellationToken);
    }

    private sealed class UserContextRow
    {
        public bool IsSansthaUser { get; init; }
        public bool CanRaiseTicket { get; init; }
        public long UserID { get; init; }
    }
}
