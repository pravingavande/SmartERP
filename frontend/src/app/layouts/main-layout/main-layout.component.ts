import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { TicketNotificationService } from '../../core/services/ticket-notification.service';
import { TicketService } from '../../core/services/ticket.service';
import { NavSection } from '../../core/models/nav.model';
import { isAppSuperAdmin } from '../../core/utils/super-admin-access.util';
import { TicketPendingModalComponent } from '../../shared/components/ticket-pending-modal/ticket-pending-modal.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TicketPendingModalComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  readonly currentYear = new Date().getFullYear();

  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly ticketService = inject(TicketService);
  private readonly ticketNotifications = inject(TicketNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarCollapsed = signal(false);
  readonly isMobileView = signal(false);
  readonly userProfileExpanded = signal(false);
  readonly profile = toSignal(this.dashboardService.getProfile(), { initialValue: null });
  readonly pendingTicket = this.ticketNotifications.pendingPopup;

  constructor() {
    afterNextRender(() => {
      this.syncViewport(true);
      fromEvent(window, 'resize')
        .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncViewport());
    });

    this.ticketService
      .getLookups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lookups) => {
        if (!lookups?.orgs?.length) return;
        const orgIds = lookups.orgs.map((o) => o.orgID);
        void this.ticketNotifications.start(orgIds);
        this.ticketNotifications.loadLoginReminders();
      });

    this.destroyRef.onDestroy(() => {
      void this.ticketNotifications.stop();
    });
  }

  private readonly baseNavSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
        {
          label: 'School Dashboard',
          icon: 'school-dashboard',
          route: '/school-dashboard',
          highlight: true
        }
      ]
    },
    {
      title: 'Audit',
      items: [{ label: 'Audit Dashboard', icon: 'audit-dashboard', route: '/audit/dashboard' }]
    },
    {
      title: 'Stock',
      items: [{ label: 'Stock Dashboard', icon: 'stock', route: '/stock/dashboard' }]
    },
    {
      title: 'Masters',
      items: [{ label: 'Masters', icon: 'register', route: '/audit/masters' }]
    },
    {
      title: 'Operations',
      items: [{ label: 'Reports', icon: 'reports', route: '/reports' }]
    },
    {
      title: 'Administration',
      items: [
        { label: 'Settings', icon: 'settings', route: '/settings' }
      ]
    }
  ];

  readonly navSections = computed<NavSection[]>(() => {
    if (!isAppSuperAdmin(this.auth.currentUser()?.userRoleId)) {
      return this.baseNavSections;
    }

    return [
      {
        title: 'App Super Admin',
        items: [
          { label: 'Sanstha Onboarding', icon: 'users', route: '/super-admin/sanstha-onboarding' }
        ]
      },
      ...this.baseNavSections
    ];
  });

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  closeSidebarIfMobile(): void {
    if (this.isMobileView()) {
      this.sidebarCollapsed.set(true);
    }
  }

  closeUserProfile(): void {
    this.userProfileExpanded.set(false);
  }

  private lastMobile: boolean | null = null;

  private syncViewport(isInitial = false): void {
    const mobile = window.innerWidth < 768;
    const wasMobile = this.lastMobile;
    this.lastMobile = mobile;
    this.isMobileView.set(mobile);

    if (isInitial && mobile) {
      this.sidebarCollapsed.set(true);
      return;
    }

    if (wasMobile !== null && wasMobile !== mobile) {
      this.sidebarCollapsed.set(mobile);
    }
  }

  toggleUserProfile(): void {
    this.userProfileExpanded.update((v) => !v);
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[parts.length - 1][0]}`;
  }

  logout(): void {
    this.auth.logout();
  }
}
