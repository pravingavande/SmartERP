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

        if (profile is null || !profile.IsUserActive || profile.OrgID is null)
            return null;

        var summary = await _dashboardRepository
            .GetSummaryByOrgIdAsync(profile.OrgID.Value, cancellationToken)
            .ConfigureAwait(false);

        if (summary is null)
            return null;

        return new DashboardSummaryDto
        {
            SansthaName = summary.SansthaName,
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
