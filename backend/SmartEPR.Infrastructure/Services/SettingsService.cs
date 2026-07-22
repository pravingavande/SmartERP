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

    public async Task<AuditEntryDaysSettingDto> GetAuditEntryDaysAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var row = await _repository.GetAuditEntryDaysAsync(underOrgId, cancellationToken).ConfigureAwait(false);
        return row ?? new AuditEntryDaysSettingDto
        {
            UnderOrgID = underOrgId,
            NewEntryNoOfPreviousDayAllowed = 0,
            EditEntryNoOfPreviousDayAllowed = 0
        };
    }

    public async Task<(AuditEntryDaysSettingDto? Data, string? Error)> SaveAuditEntryDaysAsync(
        SaveAuditEntryDaysSettingRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.UnderOrgID <= 0)
            return (null, "Under organization is required.");

        if (request.NewEntryNoOfPreviousDayAllowed < 0 || request.EditEntryNoOfPreviousDayAllowed < 0)
            return (null, "Day count cannot be negative.");

        try
        {
            var saved = await _repository.SaveAuditEntryDaysAsync(
                    request.UnderOrgID,
                    request.NewEntryNoOfPreviousDayAllowed,
                    request.EditEntryNoOfPreviousDayAllowed,
                    cancellationToken)
                .ConfigureAwait(false);
            return saved is null
                ? (null, "Unable to save audit entry day settings.")
                : (saved, null);
        }
        catch (SqlException ex)
        {
            return (null, ex.Message);
        }
    }
}
