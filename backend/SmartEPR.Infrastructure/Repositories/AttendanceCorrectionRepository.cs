using Dapper;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class AttendanceCorrectionRepository : IAttendanceCorrectionRepository
{
    private readonly StoredProcedureExecutor _executor;

    public AttendanceCorrectionRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task ReverseAsync(
        long attendanceId,
        long orgId,
        string eventType,
        long performedBy,
        string reason,
        string? metaJson,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@AttendanceID", attendanceId);
        p.Add("@OrgID", orgId);
        p.Add("@EventType", eventType);
        p.Add("@PerformedBy", performedBy);
        p.Add("@Reason", reason);
        p.Add("@MetaJson", metaJson);
        return _executor.ExecuteAsync("dbo.sp_AttendanceRecord_Reverse", p, cancellationToken);
    }

    public Task ForceCheckoutAsync(
        long attendanceId,
        long orgId,
        DateTime checkoutAt,
        long performedBy,
        string reason,
        string? metaJson,
        CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@AttendanceID", attendanceId);
        p.Add("@OrgID", orgId);
        p.Add("@CheckoutAt", checkoutAt);
        p.Add("@PerformedBy", performedBy);
        p.Add("@Reason", reason);
        p.Add("@MetaJson", metaJson);
        return _executor.ExecuteAsync("dbo.sp_AttendanceRecord_ForceCheckout", p, cancellationToken);
    }
}
