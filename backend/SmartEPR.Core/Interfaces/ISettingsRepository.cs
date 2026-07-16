using SmartEPR.Core.DTOs.Settings;

namespace SmartEPR.Core.Interfaces;

public interface ISettingsRepository
{
    Task<SoftwareLanguageDto?> GetLanguageAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<SoftwareLanguageDto?> SaveLanguageAsync(long underOrgId, string condition, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LanguageKeyValueDto>> GetLanguageKeysAsync(CancellationToken cancellationToken = default);
}

public interface ISettingsService
{
    Task<SoftwareLanguageDto> GetLanguageAsync(long underOrgId, CancellationToken cancellationToken = default);
    Task<(SoftwareLanguageDto? Data, string? Error)> SaveLanguageAsync(SaveSoftwareLanguageRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LanguageKeyValueDto>> GetLanguageKeysAsync(CancellationToken cancellationToken = default);
}
