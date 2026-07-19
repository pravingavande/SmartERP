using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Employee;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class EmployeeController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeeController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<EmployeeLookupsBundleDto>.Fail("Invalid token."));

        var lookups = await _employeeService.GetLookupsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<EmployeeLookupsBundleDto>.Ok(lookups));
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] long? orgId, [FromQuery] string? search, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(ApiResponse<IReadOnlyList<EmployeeListItemDto>>.Fail("Invalid token."));

        var items = await _employeeService.GetListAsync(userId, orgId, search, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<EmployeeListItemDto>>.Ok(items));
    }

    [HttpGet("{employeeId:long}")]
    public async Task<IActionResult> GetById(long employeeId, CancellationToken cancellationToken)
    {
        var item = await _employeeService.GetByIdAsync(employeeId, cancellationToken).ConfigureAwait(false);
        return item is null
            ? Ok(ApiResponse<EmployeeDto>.Fail("Employee not found."))
            : Ok(ApiResponse<EmployeeDto>.Ok(item));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var actorUserId))
            return Unauthorized(ApiResponse<EmployeeDto>.Fail("Invalid token."));

        var saved = await _employeeService.SaveAsync(actorUserId, request, cancellationToken).ConfigureAwait(false);
        return saved is null
            ? Ok(ApiResponse<EmployeeDto>.Fail("Unable to save employee. First name and mobile are required."))
            : Ok(ApiResponse<EmployeeDto>.Ok(saved, "Employee saved."));
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
