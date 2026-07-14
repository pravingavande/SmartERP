using Microsoft.Extensions.DependencyInjection;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Data;
using SmartEPR.Infrastructure.Repositories;
using SmartEPR.Infrastructure.Services;

namespace SmartEPR.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<SqlConnectionFactory>();
        services.AddScoped<StoredProcedureExecutor>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IDashboardRepository, DashboardRepository>();
        services.AddScoped<INoticeRepository, NoticeRepository>();
        services.AddScoped<IHealthRepository, HealthRepository>();
        services.AddScoped<IAcademicCalendarRepository, AcademicCalendarRepository>();
        services.AddScoped<IEventCalendarRepository, EventCalendarRepository>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<INoticeService, NoticeService>();
        services.AddScoped<IAcademicCalendarService, AcademicCalendarService>();
        services.AddScoped<IEventCalendarService, EventCalendarService>();
        services.AddScoped<IAuditVoucherRepository, AuditVoucherRepository>();
        services.AddScoped<IAuditVoucherService, AuditVoucherService>();
        services.AddScoped<IDonationRepository, DonationRepository>();
        services.AddScoped<IDonationService, DonationService>();
        services.AddScoped<IDonationReportService, DonationReportService>();
        services.AddScoped<ITicketRepository, TicketRepository>();
        services.AddScoped<ITicketService, TicketService>();
        services.AddScoped<IEmployeeRepository, EmployeeRepository>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<ILeaveRepository, LeaveRepository>();
        services.AddScoped<ILeaveService, LeaveService>();
        services.AddScoped<IMasterRepository, MasterRepository>();
        services.AddScoped<IMasterService, MasterService>();
        services.AddScoped<IIoRegisterRepository, IoRegisterRepository>();
        services.AddScoped<IIoRegisterService, IoRegisterService>();

        return services;
    }
}
