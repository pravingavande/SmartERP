using Dapper;
using SmartEPR.Core.DTOs.Settings;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class SettingsRepository : ISettingsRepository
{
    private readonly StoredProcedureExecutor _executor;

    public SettingsRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<SoftwareLanguageDto?> GetLanguageAsync(long underOrgId, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        return _executor.QuerySingleOrDefaultAsync<SoftwareLanguageDto>(
            "dbo.sp_SoftwareSetting_GetLanguage", p, cancellationToken);
    }

    public Task<SoftwareLanguageDto?> SaveLanguageAsync(long underOrgId, string condition, CancellationToken cancellationToken = default)
    {
        var p = new DynamicParameters();
        p.Add("@UnderOrgID", underOrgId);
        p.Add("@Condition", condition);
        p.Add("@ModifyBy", "O");
        return _executor.QuerySingleOrDefaultAsync<SoftwareLanguageDto>(
            "dbo.sp_SoftwareSetting_SaveLanguage", p, cancellationToken);
    }

    public Task<IReadOnlyList<LanguageKeyValueDto>> GetLanguageKeysAsync(CancellationToken cancellationToken = default)
        => _executor.QueryListAsync<LanguageKeyValueDto>("dbo.sp_LanguageKeyValue_GetAll", null, cancellationToken);
}
