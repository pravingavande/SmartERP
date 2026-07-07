using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.Auth;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken).ConfigureAwait(false);

        if (result is null)
            return Ok(ApiResponse<LoginResponseDto>.Fail("Invalid username or password."));

        return Ok(ApiResponse<LoginResponseDto>.Ok(result, "Login successful."));
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized(ApiResponse<UserProfileDto>.Fail("Invalid token."));

        var profile = await _authService.GetProfileAsync(userId, cancellationToken).ConfigureAwait(false);

        if (profile is null)
            return Ok(ApiResponse<UserProfileDto>.Fail("User not found."));

        return Ok(ApiResponse<UserProfileDto>.Ok(profile));
    }
}
