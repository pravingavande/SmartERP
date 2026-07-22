using SmartEPR.Core.DTOs.Teacher;

namespace SmartEPR.Core.Interfaces;

public interface ITeacherRepository
{
    Task<TeacherLookupsDto> GetLookupsAsync(long? underOrgId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeacherListItemDto>> GetListAsync(TeacherListFilterDto filter, CancellationToken cancellationToken = default);
    Task<TeacherDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default);
    Task<int?> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<bool> IsAppUserNameDuplicateAsync(string appUserName, long? excludeUserId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(long actorUserId, SaveTeacherRequestDto request, bool updatePassword, CancellationToken cancellationToken = default);
    Task SaveDocumentsAsync(long userId, IReadOnlyList<SaveTeacherDocumentDto> documents, CancellationToken cancellationToken = default);
    Task DeleteAsync(long userId, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(long userId, string appPassword, CancellationToken cancellationToken = default);
}

public interface ITeacherService
{
    Task<TeacherLookupsBundleDto> GetLookupsAsync(long userId, long? underOrgId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeacherListItemDto>> GetListAsync(TeacherListFilterDto filter, CancellationToken cancellationToken = default);
    Task<TeacherDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default);
    Task<int?> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<(TeacherDto? Data, string? Error)> SaveAsync(long actorUserId, SaveTeacherRequestDto request, CancellationToken cancellationToken = default);
    Task<(TeacherDto? Data, string? Error)> SaveDocumentsAsync(long actorUserId, long userId, IReadOnlyList<SaveTeacherDocumentDto> documents, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteAsync(long userId, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> ResetPasswordAsync(long userId, string appPassword, CancellationToken cancellationToken = default);
}
