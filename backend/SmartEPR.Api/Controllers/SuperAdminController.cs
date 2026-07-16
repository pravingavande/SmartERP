using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartEPR.Core.Common;
using SmartEPR.Core.DTOs.SuperAdmin;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/super-admin")]
public sealed class SuperAdminController : ControllerBase
{
    /// <summary>UserRoleMaster SuperAdmin.</summary>
    private const int SuperAdminRoleId = 5;

    private readonly ISuperAdminService _superAdminService;
    private readonly IUserRepository _userRepository;

    public SuperAdminController(ISuperAdminService superAdminService, IUserRepository userRepository)
    {
        _superAdminService = superAdminService;
        _userRepository = userRepository;
    }

    [HttpGet("school-categories")]
    public async Task<IActionResult> GetSchoolCategories(CancellationToken cancellationToken)
    {
        if (!await IsSuperAdminAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<object>.Fail("Only App Super Admin can access this."));

        var items = await _superAdminService.GetSchoolCategoriesAsync(cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<SuperAdminSchoolCategoryDto>>.Ok(items));
    }

    [HttpGet("sanstha-owners")]
    public async Task<IActionResult> GetSansthaOwners(CancellationToken cancellationToken)
    {
        if (!await IsSuperAdminAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<object>.Fail("Only App Super Admin can access this."));

        var items = await _superAdminService.GetSansthaOwnerListAsync(cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse<IReadOnlyList<SansthaOwnerListItemDto>>.Ok(items));
    }

    [HttpPost("sanstha-with-owner")]
    public async Task<IActionResult> CreateSansthaWithOwner(
        [FromBody] CreateSansthaWithOwnerRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!await IsSuperAdminAsync(cancellationToken).ConfigureAwait(false))
            return Ok(ApiResponse<object>.Fail("Only App Super Admin can create Sanstha + Owner."));

        TryGetUserId(out var userId);
        var (data, error) = await _superAdminService
            .CreateSansthaWithOwnerAsync(request, userId > 0 ? userId : null, cancellationToken)
            .ConfigureAwait(false);

        return data is null
            ? Ok(ApiResponse<SansthaOwnerCreatedDto>.Fail(error ?? "Unable to create Sanstha and Owner."))
            : Ok(ApiResponse<SansthaOwnerCreatedDto>.Ok(data, "Sanstha and Owner created."));
    }

    private async Task<bool> IsSuperAdminAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return false;

        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);
        return profile?.UserRoleID == SuperAdminRoleId;
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(claim, out userId);
    }
}
