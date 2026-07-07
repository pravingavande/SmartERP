using SmartEPR.Core.Entities;

namespace SmartEPR.Core.Interfaces;

public interface IUserRepository
{
    Task<UserMaster?> ValidateLoginAsync(string appUserName, string appPassword, CancellationToken cancellationToken = default);
    Task<UserProfileDetail?> GetProfileByUserIdAsync(long userId, CancellationToken cancellationToken = default);
}
