namespace SmartEPR.Core.Interfaces;

public interface IHealthRepository
{
    Task<bool> PingDatabaseAsync(CancellationToken cancellationToken = default);
}
