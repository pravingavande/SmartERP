using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace SmartEPR.Infrastructure.Data;

/// <summary>
/// Opens pooled SQL connections. SqlClient pools by default — connections are returned
/// to the pool on Dispose; never hold connections longer than a single operation.
/// </summary>
public sealed class SqlConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
    }

    public SqlConnection CreateConnection() => new(_connectionString);
}
