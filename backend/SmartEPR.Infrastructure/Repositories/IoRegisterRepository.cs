using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.DTOs.IoRegister;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class IoRegisterRepository : IIoRegisterRepository
{
    private readonly StoredProcedureExecutor _executor;
    private readonly SqlConnectionFactory _connectionFactory;

    public IoRegisterRepository(StoredProcedureExecutor executor, SqlConnectionFactory connectionFactory)
    {
        _executor = executor;
        _connectionFactory = connectionFactory;
    }

    public async Task<IoLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

        using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(
                "dbo.sp_IO_GetLookups",
                new { UserID = userId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken)).ConfigureAwait(false);

        var orgs = (await multi.ReadAsync<OrgOptionDto>().ConfigureAwait(false)).AsList();
        var years = (await multi.ReadAsync<YearIoOptionDto>().ConfigureAwait(false)).AsList();
        var activeYear = await multi.ReadFirstOrDefaultAsync<YearIoOptionDto>().ConfigureAwait(false);

        return new IoLookupsDto
        {
            Orgs = orgs,
            Years = years,
            ActiveYear = activeYear
        };
    }

    public Task<NextRecordNoDto?> GetInwardNextRecordNoAsync(long orgId, long? yioId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@YIOID", yioId);
        return _executor.QuerySingleOrDefaultAsync<NextRecordNoDto>("dbo.sp_Inward_GetNextRecordNo", p, cancellationToken);
    }

    public Task<NextRecordNoDto?> GetOutwardNextRecordNoAsync(long orgId, long? yioId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", orgId);
        p.Add("@YIOID", yioId);
        return _executor.QuerySingleOrDefaultAsync<NextRecordNoDto>("dbo.sp_Outward_GetNextRecordNo", p, cancellationToken);
    }

    public Task<IReadOnlyList<InwardRegisterDto>> GetInwardListAsync(InwardListFilterDto filter, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@YIOID", filter.YIOID);
        p.Add("@RecordNo", filter.RecordNo);
        p.Add("@FromDate", filter.FromDate);
        p.Add("@ToDate", filter.ToDate);
        p.Add("@FileNo", filter.FileNo);
        p.Add("@LetterNo", filter.LetterNo);
        p.Add("@Subject", filter.Subject);
        p.Add("@FromWhomReceived", filter.FromWhomReceived);
        p.Add("@Search", filter.Search);
        return _executor.QueryListAsync<InwardRegisterDto>("dbo.sp_Inward_GetList", p, cancellationToken);
    }

    public Task<InwardRegisterDto?> GetInwardByIdAsync(long irid, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@IRID", irid);
        return _executor.QuerySingleOrDefaultAsync<InwardRegisterDto>("dbo.sp_Inward_GetById", p, cancellationToken);
    }

    public async Task<long> SaveInwardAsync(SaveInwardRequestDto request, long? userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@IRID", request.IRID > 0 ? request.IRID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@IRDate", request.IRDate.Date);
        p.Add("@FileNo", request.FileNo);
        p.Add("@LetterNo", request.LetterNo);
        p.Add("@FromWhomReceived", request.FromWhomReceived);
        p.Add("@Subject", request.Subject);
        p.Add("@ToWhomIssued", request.ToWhomIssued);
        p.Add("@Remark", request.Remark);
        p.Add("@AttachmentPath", request.AttachmentPath);
        p.Add("@UserID", userId);
        await _executor.ExecuteAsync("dbo.sp_Inward_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@IRID");
    }

    public Task DeleteInwardAsync(long irid, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@IRID", irid);
        return _executor.ExecuteAsync("dbo.sp_Inward_Delete", p, cancellationToken);
    }

    public Task<IReadOnlyList<OutwardRegisterDto>> GetOutwardListAsync(OutwardListFilterDto filter, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@OrgID", filter.OrgID);
        p.Add("@YIOID", filter.YIOID);
        p.Add("@RecordNo", filter.RecordNo);
        p.Add("@FromDate", filter.FromDate);
        p.Add("@ToDate", filter.ToDate);
        p.Add("@FileNo", filter.FileNo);
        p.Add("@Subject", filter.Subject);
        p.Add("@Address", filter.Address);
        p.Add("@Search", filter.Search);
        return _executor.QueryListAsync<OutwardRegisterDto>("dbo.sp_Outward_GetList", p, cancellationToken);
    }

    public Task<OutwardRegisterDto?> GetOutwardByIdAsync(long orid, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ORID", orid);
        return _executor.QuerySingleOrDefaultAsync<OutwardRegisterDto>("dbo.sp_Outward_GetById", p, cancellationToken);
    }

    public async Task<long> SaveOutwardAsync(SaveOutwardRequestDto request, long? userId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ORID", request.ORID > 0 ? request.ORID : null, DbType.Int64, ParameterDirection.InputOutput);
        p.Add("@OrgID", request.OrgID);
        p.Add("@ORDate", request.ORDate.Date);
        p.Add("@Enclosures", request.Enclosures);
        p.Add("@Address", request.Address);
        p.Add("@Subject", request.Subject);
        p.Add("@FileNo", request.FileNo);
        p.Add("@ORRDate", request.ORRDate?.Date);
        p.Add("@ExpensesAmt", request.ExpensesAmt);
        p.Add("@Remark", request.Remark);
        p.Add("@AttachmentPath", request.AttachmentPath);
        p.Add("@UserID", userId);
        await _executor.ExecuteAsync("dbo.sp_Outward_Save", p, cancellationToken).ConfigureAwait(false);
        return p.Get<long>("@ORID");
    }

    public Task DeleteOutwardAsync(long orid, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@ORID", orid);
        return _executor.ExecuteAsync("dbo.sp_Outward_Delete", p, cancellationToken);
    }
}
