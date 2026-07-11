using SmartEPR.Core.DTOs.Auth;
using SmartEPR.Core.DTOs.Dashboard;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

public sealed class DashboardService : IDashboardService
{
    private readonly IUserRepository _userRepository;
    private readonly IDashboardRepository _dashboardRepository;

    public DashboardService(IUserRepository userRepository, IDashboardRepository dashboardRepository)
    {
        _userRepository = userRepository;
        _dashboardRepository = dashboardRepository;
    }

    public async Task<DashboardSummaryDto?> GetSummaryAsync(int userId, CancellationToken cancellationToken = default)
    {
        var profile = await _userRepository.GetProfileByUserIdAsync(userId, cancellationToken).ConfigureAwait(false);

        if (profile is null || !profile.IsUserActive)
            return null;

        var orgGroups = await _userRepository
            .GetLoginOrgGroupsByAppUserNameAsync(profile.AppUserName, cancellationToken)
            .ConfigureAwait(false);
        var primary = orgGroups.FirstOrDefault();
        var summaryOrgId = primary?.OrgGroupID
            ?? (profile.SchoolCode is > 0 ? (int)profile.SchoolCode.Value : profile.OrgID);

        if (summaryOrgId is null or <= 0)
            return null;

        var summary = await _dashboardRepository
            .GetSummaryByOrgIdAsync(summaryOrgId.Value, cancellationToken)
            .ConfigureAwait(false);

        if (summary is null)
            return null;

        var sansthaName = primary?.OrganizationGroupName ?? summary.SansthaName;

        return new DashboardSummaryDto
        {
            SansthaName = sansthaName,
            TotalSchool = summary.TotalSchool,
            TotalStudent = summary.TotalStudent,
            TotalTeacher = summary.TotalTeacher,
            TeachingStaff = summary.TeachingStaff,
            NonTeachingStaff = summary.NonTeachingStaff,
            PermanentStaff = summary.PermanentStaff,
            TemporaryStaff = summary.TemporaryStaff,
            MaleStudents = summary.MaleStudents,
            FemaleStudents = summary.FemaleStudents,
            MaleTeachers = summary.MaleTeachers,
            FemaleTeachers = summary.FemaleTeachers
        };
    }
}
