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

        var expiresAt = DateTime.UtcNow.AddHours(GetTokenExpiryHours());
        var token = GenerateToken(user, expiresAt);

        return new LoginResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            UserId = (int)user.UserID,
            UserName = user.AppUserName,
            DisplayName = user.DisplayName,
            RoleCode = "USER"
        };
    }

    public async Task<UserProfileDto?> GetProfileAsync(int userId, CancellationToken cancellationToken = default)
    {
        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);

        if (profile is null || !profile.IsUserActive)
            return null;

        return MapProfile(profile);
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

    private string GenerateToken(UserMaster user, DateTime expiresAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtSecret()));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.AppUserName),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, "USER"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

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
