using SmartEPR.Core.DTOs.Teacher;

namespace SmartEPR.Core.Interfaces;

public interface ITeacherRepository
{
    Task<TeacherLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeacherListItemDto>> GetListAsync(TeacherListFilterDto filter, CancellationToken cancellationToken = default);
    Task<TeacherDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default);
    Task<int?> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<bool> IsAppUserNameDuplicateAsync(string appUserName, long? excludeUserId, CancellationToken cancellationToken = default);
    Task<long> SaveAsync(SaveTeacherRequestDto request, bool updatePassword, CancellationToken cancellationToken = default);
    Task DeleteAsync(long userId, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(long userId, string appPassword, CancellationToken cancellationToken = default);
}

public interface ITeacherService
{
    Task<TeacherLookupsBundleDto> GetLookupsAsync(long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeacherListItemDto>> GetListAsync(TeacherListFilterDto filter, CancellationToken cancellationToken = default);
    Task<TeacherDto?> GetByIdAsync(long userId, CancellationToken cancellationToken = default);
    Task<int?> GetNextSrNoAsync(long orgId, CancellationToken cancellationToken = default);
    Task<(TeacherDto? Data, string? Error)> SaveAsync(SaveTeacherRequestDto request, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeleteAsync(long userId, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> ResetPasswordAsync(long userId, string appPassword, CancellationToken cancellationToken = default);
}
