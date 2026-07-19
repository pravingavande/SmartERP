import { Routes } from '@angular/router';
import { authGuard, adminMasterGuard, guestGuard, superAdminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'academic-calendar',
        loadComponent: () =>
          import('./features/audit/academic-schedule/academic-schedule.component').then((m) => m.AcademicScheduleComponent)
      },
      {
        path: 'event-calendar',
        loadComponent: () =>
          import('./features/event-calendar/event-calendar.component').then((m) => m.EventCalendarComponent)
      },
      {
        path: 'audit/dashboard',
        loadComponent: () =>
          import('./features/audit/audit-dashboard/audit-dashboard.component').then((m) => m.AuditDashboardComponent)
      },
      {
        path: 'audit/masters',
        loadComponent: () =>
          import('./features/audit/master-hub/master-hub.component').then((m) => m.MasterHubComponent)
      },
      {
        path: 'audit/receipt-voucher',
        loadComponent: () =>
          import('./features/audit/receipt-voucher/receipt-voucher.component').then((m) => m.ReceiptVoucherComponent)
      },
      {
        path: 'audit/payment-voucher',
        loadComponent: () =>
          import('./features/audit/payment-voucher/payment-voucher.component').then((m) => m.PaymentVoucherComponent)
      },
      {
        path: 'audit/bank-deposit',
        loadComponent: () =>
          import('./features/audit/bank-deposit/bank-deposit.component').then((m) => m.BankDepositComponent)
      },
      {
        path: 'audit/bank-withdraw',
        loadComponent: () =>
          import('./features/audit/bank-withdraw/bank-withdraw.component').then((m) => m.BankWithdrawComponent)
      },
      {
        path: 'audit/donation',
        loadComponent: () =>
          import('./features/audit/donation-entry/donation-entry.component').then((m) => m.DonationEntryComponent)
      },
      {
        path: 'audit/party-master',
        loadComponent: () =>
          import('./features/audit/party-master/party-master.component').then((m) => m.PartyMasterComponent)
      },
      {
        path: 'audit/organization-master',
        redirectTo: 'schools',
        pathMatch: 'full'
      },
      {
        path: 'audit/ledger-head-master',
        loadComponent: () =>
          import('./features/audit/ledger-head-master/ledger-head-master.component').then((m) => m.LedgerHeadMasterComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'audit/account-register-master',
        loadComponent: () =>
          import('./features/audit/account-register-master/account-register-master.component').then((m) => m.AccountRegisterMasterComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'audit/account-register-define',
        loadComponent: () =>
          import('./features/audit/account-register-define/account-register-define.component').then((m) => m.AccountRegisterDefineComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'audit/donation-head-master',
        loadComponent: () =>
          import('./features/audit/donation-head-master/donation-head-master.component').then((m) => m.DonationHeadMasterComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'audit/leave-type-master',
        loadComponent: () =>
          import('./features/employee/leave-type-master/leave-type-master.component').then((m) => m.LeaveTypeMasterComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'audit/class-master',
        loadComponent: () =>
          import('./features/audit/class-master/class-master.component').then((m) => m.ClassMasterComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'audit/event-types-master',
        loadComponent: () =>
          import('./features/audit/event-types-master/event-types-master.component').then((m) => m.EventTypesMasterComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'audit/subject-master',
        loadComponent: () =>
          import('./features/audit/subject-master/subject-master.component').then((m) => m.SubjectMasterComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'audit/academic-schedule',
        redirectTo: 'academic-calendar',
        pathMatch: 'full'
      },
      {
        path: 'audit/item-group-master',
        redirectTo: 'stock/item-group-master',
        pathMatch: 'full'
      },
      {
        path: 'audit/item-master',
        redirectTo: 'stock/item-master',
        pathMatch: 'full'
      },
      {
        path: 'audit/stock-register',
        redirectTo: 'stock/register',
        pathMatch: 'full'
      },
      {
        path: 'stock/dashboard',
        loadComponent: () =>
          import('./features/stock/stock-dashboard/stock-dashboard.component').then((m) => m.StockDashboardComponent)
      },
      {
        path: 'stock/register',
        loadComponent: () =>
          import('./features/audit/stock-register/stock-register.component').then((m) => m.StockRegisterComponent)
      },
      {
        path: 'stock/item-group-master',
        loadComponent: () =>
          import('./features/audit/item-group-master/item-group-master.component').then((m) => m.ItemGroupMasterComponent),
        canActivate: [adminMasterGuard]
      },
      {
        path: 'stock/item-master',
        loadComponent: () =>
          import('./features/audit/item-master/item-master.component').then((m) => m.ItemMasterComponent),
        canActivate: [adminMasterGuard]
      },
      { path: 'stock', pathMatch: 'full', redirectTo: 'stock/dashboard' },
      {
        path: 'io/dashboard',
        loadComponent: () =>
          import('./features/io/io-dashboard/io-dashboard.component').then((m) => m.IoDashboardComponent)
      },
      {
        path: 'io/inward',
        loadComponent: () =>
          import('./features/io/inward-register/inward-register.component').then((m) => m.InwardRegisterComponent)
      },
      {
        path: 'io/outward',
        loadComponent: () =>
          import('./features/io/outward-register/outward-register.component').then((m) => m.OutwardRegisterComponent)
      },
      { path: 'io', pathMatch: 'full', redirectTo: 'io/dashboard' },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/ticket/ticket-entry/ticket-entry.component').then((m) => m.TicketEntryComponent)
      },
      {
        path: 'schools',
        loadComponent: () =>
          import('./features/organization/organization-master/organization-master.component').then((m) => m.OrganizationMasterComponent)
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/placeholder/coming-soon.component').then((m) => m.ComingSoonComponent),
        data: { title: 'Students' }
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('./features/employee/employee-entry/employee-entry.component').then((m) => m.EmployeeEntryComponent)
      },
      {
        path: 'teacher-master',
        loadComponent: () =>
          import('./features/teacher/teacher-entry/teacher-entry.component').then((m) => m.TeacherEntryComponent)
      },
      {
        path: 'staff/leave-type-master',
        redirectTo: 'audit/leave-type-master',
        pathMatch: 'full'
      },
      {
        path: 'staff/leave-apply',
        loadComponent: () =>
          import('./features/employee/leave-apply/leave-apply.component').then((m) => m.LeaveApplyComponent)
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/placeholder/coming-soon.component').then((m) => m.ComingSoonComponent),
        data: { title: 'Attendance' }
      },
      {
        path: 'notices',
        loadComponent: () =>
          import('./features/placeholder/coming-soon.component').then((m) => m.ComingSoonComponent),
        data: { title: 'Notices' }
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports-hub/reports-hub.component').then((m) => m.ReportsHubComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/placeholder/coming-soon.component').then((m) => m.ComingSoonComponent),
        data: { title: 'User Management' }
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent)
      },
      {
        path: 'super-admin/sanstha-onboarding',
        loadComponent: () =>
          import('./features/super-admin/sanstha-onboarding/sanstha-onboarding.component').then(
            (m) => m.SansthaOnboardingComponent
          ),
        canActivate: [superAdminGuard]
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
