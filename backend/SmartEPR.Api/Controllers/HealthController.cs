using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    private readonly IHealthRepository _healthRepository;

    public HealthController(IHealthRepository healthRepository)
    {
        _healthRepository = healthRepository;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var dbOk = await _healthRepository.PingDatabaseAsync(cancellationToken).ConfigureAwait(false);

        return Ok(new
        {
            status = dbOk ? "healthy" : "degraded",
            database = dbOk,
            timestamp = DateTime.UtcNow
        });
    }
}
