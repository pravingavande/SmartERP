import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { NavSection } from '../../core/models/nav.model';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  readonly currentYear = new Date().getFullYear();

  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarCollapsed = signal(false);
  readonly isMobileView = signal(false);
  readonly userProfileExpanded = signal(false);
  readonly profile = toSignal(this.dashboardService.getProfile(), { initialValue: null });

  constructor() {
    afterNextRender(() => {
      this.syncViewport(true);
      fromEvent(window, 'resize')
        .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncViewport());
    });
  }

  readonly navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
        { label: 'Teachers & Staff', icon: 'staff', route: '/staff' },
        { label: 'Leave Type Master', icon: 'attendance', route: '/staff/leave-type-master' },
        { label: 'Employee Leave Apply', icon: 'attendance', route: '/staff/leave-apply' }
      ]
    },
    {
      title: 'Academic',
      items: [
        { label: 'शैक्षणिक दिनदर्शिका', icon: 'academic-calendar', route: '/academic-calendar' },
        { label: 'Event Calendar', icon: 'event-calendar', route: '/event-calendar' },
        { label: 'Schools', icon: 'school', route: '/schools' },
        { label: 'Students', icon: 'students', route: '/students' }
      ]
    },
    {
      title: 'Audit',
      items: [{ label: 'Audit Dashboard', icon: 'audit-dashboard', route: '/audit/dashboard' }]
    },
    {
      title: 'Masters',
      items: [{ label: 'Masters', icon: 'register', route: '/audit/masters' }]
    },
    {
      title: 'Operations',
      items: [
        { label: 'Ticket Raise', icon: 'ticket', route: '/tickets' },
        { label: 'Attendance', icon: 'attendance', route: '/attendance' },
        { label: 'Notices', icon: 'notice', route: '/notices' },
        { label: 'Reports', icon: 'reports', route: '/reports' }
      ]
    },
    {
      title: 'Administration',
      items: [
        { label: 'User Management', icon: 'users', route: '/users' },
        { label: 'Settings', icon: 'settings', route: '/settings' }
      ]
    }
  ];

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
