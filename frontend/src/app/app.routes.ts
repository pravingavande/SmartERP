import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

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
          import('./features/academic-calendar/academic-calendar.component').then((m) => m.AcademicCalendarComponent)
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
        path: 'audit/ledger-head-master',
        loadComponent: () =>
          import('./features/audit/ledger-head-master/ledger-head-master.component').then((m) => m.LedgerHeadMasterComponent)
      },
      {
        path: 'audit/account-register-define',
        loadComponent: () =>
          import('./features/audit/account-register-define/account-register-define.component').then((m) => m.AccountRegisterDefineComponent)
      },
      {
        path: 'audit/donation-head-define',
        loadComponent: () =>
          import('./features/audit/donation-head-define/donation-head-define.component').then((m) => m.DonationHeadDefineComponent)
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/ticket/ticket-entry/ticket-entry.component').then((m) => m.TicketEntryComponent)
      },
      {
        path: 'schools',
        loadComponent: () =>
          import('./features/placeholder/coming-soon.component').then((m) => m.ComingSoonComponent),
        data: { title: 'Schools' }
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
        path: 'staff/leave-type-master',
        loadComponent: () =>
          import('./features/employee/leave-type-master/leave-type-master.component').then((m) => m.LeaveTypeMasterComponent)
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
          import('./features/placeholder/coming-soon.component').then((m) => m.ComingSoonComponent),
        data: { title: 'Reports' }
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
          import('./features/placeholder/coming-soon.component').then((m) => m.ComingSoonComponent),
        data: { title: 'Settings' }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
