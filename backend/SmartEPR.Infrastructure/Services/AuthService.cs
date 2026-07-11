using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartEPR.Core.DTOs.Auth;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;

    public AuthService(IUserRepository userRepository, IConfiguration configuration)
    {
        _userRepository = userRepository;
        _configuration = configuration;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
            return null;

        var user = await _userRepository.ValidateLoginAsync(
                request.UserName.Trim(),
                request.Password,
                cancellationToken)
            .ConfigureAwait(false);

        if (user is null || !user.IsUserActive)
            return null;

        var orgGroups = await _userRepository
            .GetLoginOrgGroupsByAppUserNameAsync(user.AppUserName, cancellationToken)
            .ConfigureAwait(false);
        var schoolContexts = orgGroups.Select(MapSchoolContext).ToList();
        var primarySchool = schoolContexts.FirstOrDefault();
        var primaryOrgGroup = orgGroups.FirstOrDefault();

        var expiresAt = DateTime.UtcNow.AddHours(GetTokenExpiryHours());
        var token = GenerateToken(user, expiresAt, primarySchool);

        return new LoginResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            UserId = (int)user.UserID,
            UserName = user.AppUserName,
            DisplayName = user.DisplayName,
            RoleCode = "USER",
            SchoolId = primarySchool?.SchoolId,
            SansthaId = primarySchool?.SansthaId,
            SchoolName = primarySchool?.SchoolName,
            SansthaName = primarySchool?.SansthaName,
            UserTypeId = primaryOrgGroup?.UserTypeID,
            UserTypeName = primaryOrgGroup?.UserTypeName,
            SchoolContexts = schoolContexts
        };
    }

    public async Task<UserProfileDto?> GetProfileAsync(int userId, CancellationToken cancellationToken = default)
    {
        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);

        if (profile is null || !profile.IsUserActive)
            return null;

        var dto = MapProfile(profile);
        var orgGroups = await _userRepository
            .GetLoginOrgGroupsByAppUserNameAsync(profile.AppUserName, cancellationToken)
            .ConfigureAwait(false);
        var primary = orgGroups.FirstOrDefault();

        if (primary is null)
            return dto;

        return new UserProfileDto
        {
            UserId = dto.UserId,
            UserName = dto.UserName,
            DisplayName = dto.DisplayName,
            FirstName = dto.FirstName,
            MiddleName = dto.MiddleName,
            LastName = dto.LastName,
            Email = dto.Email,
            MobileNo1 = dto.MobileNo1,
            MobileNo2 = dto.MobileNo2,
            SchoolCode = dto.SchoolCode,
            OrgId = primary.OrgID,
            SchoolName = primary.OrganizationName,
            SansthaName = primary.OrganizationGroupName,
            DesignationName = dto.DesignationName,
            DesignationCode = dto.DesignationCode,
            UserTypeId = dto.UserTypeId,
            GenderCode = dto.GenderCode,
            DateOfBirth = dto.DateOfBirth,
            PanNo = dto.PanNo,
            ShalarthId = dto.ShalarthId,
            RoleCode = dto.RoleCode,
            IsActive = dto.IsActive
        };
    }

    private static UserProfileDto MapProfile(UserProfileDetail profile) =>
        new()
        {
            UserId = (int)profile.UserID,
            UserName = profile.AppUserName,
            DisplayName = profile.DisplayName,
            FirstName = profile.Firstname,
            MiddleName = profile.MiddleName,
            LastName = profile.LastName,
            Email = profile.EmailID ?? profile.AppUserName,
            MobileNo1 = profile.MobileNo1,
            MobileNo2 = profile.MobileNo2,
            SchoolCode = profile.SchoolCode,
            OrgId = profile.OrgID,
            SansthaName = profile.SansthaName,
            SchoolName = profile.SchoolName,
            DesignationName = profile.DesignationName,
            DesignationCode = profile.DesignationCode,
            UserTypeId = profile.UserTypeID,
            GenderCode = profile.GenderCode,
            DateOfBirth = profile.Dob,
            PanNo = profile.PanNo,
            ShalarthId = profile.ShalarthID,
            RoleCode = "USER",
            IsActive = profile.IsUserActive
        };

    private static UserLoginSchoolContextDto MapSchoolContext(UserLoginOrgGroup row) =>
        new()
        {
            SchoolId = row.OrgID,
            SansthaId = row.OrgGroupID,
            AppUserName = row.AppUserName,
            SchoolName = row.OrganizationName,
            SansthaName = row.OrganizationGroupName
        };

    private string GenerateToken(UserMaster user, DateTime expiresAt, UserLoginSchoolContextDto? schoolContext)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtSecret()));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.AppUserName),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Role, "USER"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (schoolContext is not null)
        {
            claims.Add(new Claim("school_id", schoolContext.SchoolId.ToString()));
            claims.Add(new Claim("sanstha_id", schoolContext.SansthaId.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GetJwtSecret() =>
        _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT secret is not configured.");

    private int GetTokenExpiryHours() =>
        int.TryParse(_configuration["Jwt:ExpiryHours"], out var hours) ? hours : 8;
}
