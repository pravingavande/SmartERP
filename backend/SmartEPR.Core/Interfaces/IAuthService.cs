using SmartEPR.Core.DTOs.Auth;

namespace SmartEPR.Core.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> GetProfileAsync(int userId, CancellationToken cancellationToken = default);
}
