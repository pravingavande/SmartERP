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
        return new TicketUserContextDto { IsSansthaUser = row?.IsSansthaUser ?? false };
    }

    public Task<IReadOnlyList<TicketStatusOptionDto>> GetStatusesAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<TicketStatusOptionDto>("dbo.sp_Ticket_GetStatuses", null, cancellationToken);

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

    public async Task<long> SaveAsync(long userId, string? ipAddress, SaveTicketRequestDto request, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@TicketID", request.TicketID > 0 ? request.TicketID : null, dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@TicketDate", request.TicketDate);
        p.Add("@Description", request.Description);
        p.Add("@Amount", request.Amount);
        p.Add("@TicketStatusID", request.TicketStatusID);
        p.Add("@Attachment", request.Attachment);
        p.Add("@UserID", userId);
        p.Add("@IP", ipAddress);

        await _executor.ExecuteAsync("dbo.sp_Ticket_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@TicketID");
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
    }
}
