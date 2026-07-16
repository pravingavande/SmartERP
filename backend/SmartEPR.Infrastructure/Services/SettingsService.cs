using Microsoft.Data.SqlClient;
using SmartEPR.Core.DTOs.Settings;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class SettingsService : ISettingsService
{
    private readonly ISettingsRepository _repository;

    public SettingsService(ISettingsRepository repository)
    {
        _repository = repository;
    }

    public async Task<SoftwareLanguageDto> GetLanguageAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var row = await _repository.GetLanguageAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return row ?? new SoftwareLanguageDto
        {
            UnderOrgID = underOrgId,
            Title = "Software Language",
            Condition = "E",
            Description = "M-Marathi Software, E - English Software"
        };
    }

    public async Task<(SoftwareLanguageDto? Data, string? Error)> SaveLanguageAsync(
        SaveSoftwareLanguageRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.UnderOrgID <= 0)
            return (null, "Under organization is required.");

        var condition = (request.Condition ?? string.Empty).Trim().ToUpperInvariant();
        if (condition is not ("M" or "E"))
            return (null, "Language must be M (Marathi) or E (English).");

        try
        {
            var saved = await _repository.SaveLanguageAsync(request.UnderOrgID, condition, cancellationToken)
                .ConfigureAwait(false);
            return saved is null
                ? (null, "Unable to save language setting.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }

    public Task<IReadOnlyList<LanguageKeyValueDto>> GetLanguageKeysAsync(CancellationToken cancellationToken = default)
        => _repository.GetLanguageKeysAsync(cancellationToken);
}
