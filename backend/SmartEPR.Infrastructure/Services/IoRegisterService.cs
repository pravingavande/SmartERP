using System.Text;
using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.IoRegister;
using SmartEPR.Core.Interfaces;
using SmartEPR.Core.Validation;

namespace SmartEPR.Infrastructure.Services;

public sealed class IoRegisterService : IIoRegisterService
{
    private readonly IIoRegisterRepository _repository;

    public IoRegisterService(IIoRegisterRepository repository)
    {
        _repository = repository;
    }

    public Task<IoLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default)
        => _repository.GetLookupsAsync(userId, cancellationToken);

    public Task<NextRecordNoDto?> GetInwardNextRecordNoAsync(long orgId, long? yioId, CancellationToken cancellationToken = default)
        => _repository.GetInwardNextRecordNoAsync(orgId, yioId, cancellationToken);

    public Task<NextRecordNoDto?> GetOutwardNextRecordNoAsync(long orgId, long? yioId, CancellationToken cancellationToken = default)
        => _repository.GetOutwardNextRecordNoAsync(orgId, yioId, cancellationToken);

    public Task<IReadOnlyList<InwardRegisterDto>> GetInwardListAsync(InwardListFilterDto filter, CancellationToken cancellationToken = default)
        => _repository.GetInwardListAsync(filter, cancellationToken);

    public Task<InwardRegisterDto?> GetInwardByIdAsync(long irid, CancellationToken cancellationToken = default)
        => _repository.GetInwardByIdAsync(irid, cancellationToken);

    public async Task<(InwardRegisterDto? Data, string? Error)> SaveInwardAsync(SaveInwardRequestDto request, long? userId, CancellationToken cancellationToken = default)
    {
        request.FromWhomReceived = MasterValidators.Trim(request.FromWhomReceived);
        request.Subject = MasterValidators.Trim(request.Subject);
        request.FileNo = MasterValidators.Trim(request.FileNo);
        request.LetterNo = MasterValidators.Trim(request.LetterNo);
        request.ToWhomIssued = MasterValidators.Trim(request.ToWhomIssued);
        request.Remark = MasterValidators.Trim(request.Remark);

        var error = MasterValidators.FirstError(
            MasterValidators.RequirePositiveId(request.OrgID, "Organization"),
            MasterValidators.RequireDate(request.IRDate, "Inward date"),
            MasterValidators.RequireText(request.FromWhomReceived, "From whom received"),
            MasterValidators.RequireText(request.Subject, "Subject"));
        if (error is not null) return (null, error);

        try
        {
            var id = await _repository.SaveInwardAsync(request, userId, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetInwardByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null ? (null, "Unable to save inward entry.") : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteInwardAsync(long irid, CancellationToken cancellationToken = default)
    {
        if (irid <= 0) return (false, "Inward entry is required.");
        try
        {
            await _repository.DeleteInwardAsync(irid, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public Task<IReadOnlyList<OutwardRegisterDto>> GetOutwardListAsync(OutwardListFilterDto filter, CancellationToken cancellationToken = default)
        => _repository.GetOutwardListAsync(filter, cancellationToken);

    public Task<OutwardRegisterDto?> GetOutwardByIdAsync(long orid, CancellationToken cancellationToken = default)
        => _repository.GetOutwardByIdAsync(orid, cancellationToken);

    public async Task<(OutwardRegisterDto? Data, string? Error)> SaveOutwardAsync(SaveOutwardRequestDto request, long? userId, CancellationToken cancellationToken = default)
    {
        request.Address = MasterValidators.Trim(request.Address);
        request.Subject = MasterValidators.Trim(request.Subject);
        request.FileNo = MasterValidators.Trim(request.FileNo);
        request.Enclosures = MasterValidators.Trim(request.Enclosures);
        request.Remark = MasterValidators.Trim(request.Remark);

        var error = MasterValidators.FirstError(
            MasterValidators.RequirePositiveId(request.OrgID, "Organization"),
            MasterValidators.RequireDate(request.ORDate, "Outward date"),
            MasterValidators.RequireText(request.Address, "Address"),
            MasterValidators.RequireText(request.Subject, "Subject"),
            MasterValidators.RequireNonNegativeDecimal(request.ExpensesAmt, "Expenses amount"));
        if (error is not null) return (null, error);

        try
        {
            var id = await _repository.SaveOutwardAsync(request, userId, cancellationToken).ConfigureAwait(false);
            var saved = await _repository.GetOutwardByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return saved is null ? (null, "Unable to save outward entry.") : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> DeleteOutwardAsync(long orid, CancellationToken cancellationToken = default)
    {
        if (orid <= 0) return (false, "Outward entry is required.");
        try
        {
            await _repository.DeleteOutwardAsync(orid, cancellationToken).ConfigureAwait(false);
            return (true, null);
        }
        catch (SqlException ex)
        {
            return (false, ex.Message);
        }
    }

    public string BuildInwardReportCsv(IReadOnlyList<InwardRegisterDto> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Record No,Date,File No,Letter No,From Whom Received,Subject,To Whom Issued,Remarks,Year");
        foreach (var row in rows)
        {
            sb.AppendLine(string.Join(',',
                Csv(row.RecordNo.ToString()),
                Csv(row.IRDate.ToString("dd/MM/yyyy")),
                Csv(row.FileNo),
                Csv(row.LetterNo),
                Csv(row.FromWhomReceived),
                Csv(row.Subject),
                Csv(row.ToWhomIssued),
                Csv(row.Remark),
                Csv(row.YearName)));
        }
        return sb.ToString();
    }

    public string BuildOutwardReportCsv(IReadOnlyList<OutwardRegisterDto> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Record No,Date,File No,Subject,Address,Enclosures,Expenses Amount,Remarks,Year");
        foreach (var row in rows)
        {
            sb.AppendLine(string.Join(',',
                Csv(row.RecordNo.ToString()),
                Csv(row.ORDate.ToString("dd/MM/yyyy")),
                Csv(row.FileNo),
                Csv(row.Subject),
                Csv(row.Address),
                Csv(row.Enclosures),
                Csv(row.ExpensesAmt.ToString("0.00")),
                Csv(row.Remark),
                Csv(row.YearName)));
        }
        return sb.ToString();
    }

    private static string Csv(string? value)
    {
        var text = value ?? string.Empty;
        if (text.Contains('"') || text.Contains(',') || text.Contains('\n'))
            return $"\"{text.Replace("\"", "\"\"")}\"";
        return text;
    }
}
