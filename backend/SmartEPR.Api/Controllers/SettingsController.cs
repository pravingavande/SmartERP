using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Settings;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet("language")]
    public async Task<IActionResult> GetLanguage([FromQuery] long underOrgID, CancellationToken cancellationToken)
    {
        if (underOrgID <= 0)
            return Ok(ApiResponse<SoftwareLanguageDto>.Fail("Under organization is required."));

        var data = await _settingsService.GetLanguageAsync(underOrgID, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<SoftwareLanguageDto>.Ok(data));
    }

    [HttpPost("language")]
    public async Task<IActionResult> SaveLanguage([FromBody] SaveSoftwareLanguageRequestDto request, CancellationToken cancellationToken)
    {
        var (data, error) = await _settingsService.SaveLanguageAsync(request, cancellationToken).ConfigureAwait(false);
        return data is null
            ? Ok(ApiResponse<SoftwareLanguageDto>.Fail(error ?? "Unable to save language setting."))
            : Ok(ApiResponse<SoftwareLanguageDto>.Ok(data, "Language setting saved."));
    }

    [HttpGet("language-keys")]
    public async Task<IActionResult> GetLanguageKeys(CancellationToken cancellationToken)
    {
        var items = await _settingsService.GetLanguageKeysAsync(cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<LanguageKeyValueDto>>.Ok(items));
    }
}
