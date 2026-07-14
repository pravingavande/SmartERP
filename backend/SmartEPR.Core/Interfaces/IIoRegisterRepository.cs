using SmartEPR.Core.DTOs.IoRegister;

namespace SmartEPR.Core.Interfaces;

public interface IIoRegisterRepository
{
    Task<IoLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<NextRecordNoDto?> GetInwardNextRecordNoAsync(long orgId, long? yioId, CancellationToken cancellationToken = default);
    Task<NextRecordNoDto?> GetOutwardNextRecordNoAsync(long orgId, long? yioId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InwardRegisterDto>> GetInwardListAsync(InwardListFilterDto filter, CancellationToken cancellationToken = default);
    Task<InwardRegisterDto?> GetInwardByIdAsync(long irid, CancellationToken cancellationToken = default);
    Task<long> SaveInwardAsync(SaveInwardRequestDto request, long? userId, CancellationToken cancellationToken = default);
    Task DeleteInwardAsync(long irid, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OutwardRegisterDto>> GetOutwardListAsync(OutwardListFilterDto filter, CancellationToken cancellationToken = default);
    Task<OutwardRegisterDto?> GetOutwardByIdAsync(long orid, CancellationToken cancellationToken = default);
    Task<long> SaveOutwardAsync(SaveOutwardRequestDto request, long? userId, CancellationToken cancellationToken = default);
    Task DeleteOutwardAsync(long orid, CancellationToken cancellationToken = default);
}

public interface IIoRegisterService
{
    Task<IoLookupsDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<NextRecordNoDto?> GetInwardNextRecordNoAsync(long orgId, long? yioId, CancellationToken cancellationToken = default);
    Task<NextRecordNoDto?> GetOutwardNextRecordNoAsync(long orgId, long? yioId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InwardRegisterDto>> GetInwardListAsync(InwardListFilterDto filter, CancellationToken cancellationToken = default);
    Task<InwardRegisterDto?> GetInwardByIdAsync(long irid, CancellationToken cancellationToken = default);
    Task<(InwardRegisterDto? Data, string? Error)> SaveInwardAsync(SaveInwardRequestDto request, long? userId, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteInwardAsync(long irid, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OutwardRegisterDto>> GetOutwardListAsync(OutwardListFilterDto filter, CancellationToken cancellationToken = default);
    Task<OutwardRegisterDto?> GetOutwardByIdAsync(long orid, CancellationToken cancellationToken = default);
    Task<(OutwardRegisterDto? Data, string? Error)> SaveOutwardAsync(SaveOutwardRequestDto request, long? userId, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteOutwardAsync(long orid, CancellationToken cancellationToken = default);
    string BuildInwardReportCsv(IReadOnlyList<InwardRegisterDto> rows);
    string BuildOutwardReportCsv(IReadOnlyList<OutwardRegisterDto> rows);
}
