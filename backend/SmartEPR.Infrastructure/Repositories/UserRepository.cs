using Dapper;
using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;

namespace SmartEPR.Infrastructure.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly StoredProcedureExecutor _executor;

    public UserRepository(StoredProcedureExecutor executor)
    {
        _executor = executor;
    }

    public Task<UserMaster?> ValidateLoginAsync(string appUserName, string appPassword, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@AppUserName", appUserName);
        parameters.Add("@AppPassword", appPassword);

        return _executor.QuerySingleOrDefaultAsync<UserMaster>(
            "dbo.sp_UserMaster_ValidateLogin",
            parameters,
            cancellationToken);
    }

    public Task<UserProfileDetail?> GetProfileByUserIdAsync(long userId, CancellationToken cancellationToken = default)
    {
        var parameters = new DynamicParameters();
        parameters.Add("@UserID", userId);

        return _executor.QuerySingleOrDefaultAsync<UserProfileDetail>(
            "dbo.sp_UserMaster_GetProfileByUserId",
            parameters,
            cancellationToken);
    }
}
