using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;

namespace SmartEPR.Infrastructure.Data;

/// <summary>
/// Executes stored procedures only. Keeps connections short-lived via using blocks.
/// </summary>
public sealed class StoredProcedureExecutor
{
    private readonly SqlConnectionFactory _connectionFactory;

    public StoredProcedureExecutor(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<T?> QuerySingleOrDefaultAsync<T>(
        string procedureName,
        DynamicParameters? parameters = null,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        return await connection.QuerySingleOrDefaultAsync<T>(
            new CommandDefinition(
                procedureName,
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);
    }

    public async Task<int> ExecuteAsync(
        string procedureName,
        DynamicParameters? parameters = null,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        return await connection.ExecuteAsync(
            new CommandDefinition(
                procedureName,
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<T>> QueryListAsync<T>(
        string procedureName,
        DynamicParameters? parameters = null,
        CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        var rows = await connection.QueryAsync<T>(
            new CommandDefinition(
                procedureName,
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        return rows.AsList();
    }
}
