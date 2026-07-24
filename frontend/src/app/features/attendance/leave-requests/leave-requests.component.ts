import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AttendanceLeaveRequest } from '../../../core/models/attendance.model';
import { OrgOption } from '../../../core/models/audit.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IoRegisterService } from '../../../core/services/io-register.service';
import { ToastService } from '../../../core/services/toast.service';
import { isAttendanceOnlyUser, resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';

@Component({
  selector: 'app-attendance-leave-requests',
  imports: [FormsModule, OrgSchoolSelectComponent],
  templateUrl: './leave-requests.component.html',
  styleUrl: './leave-requests.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceLeaveRequestsComponent {
  private readonly attendance = inject(AttendanceService);
  private readonly io = inject(IoRegisterService);
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<AttendanceLeaveRequest[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly filterStatus = signal('');
  readonly busyId = signal<number | null>(null);
  readonly orgs = signal<OrgOption[]>([]);
  readonly orgId = signal<number | null>(null);

  constructor() {
    forkJoin({
      lookups: this.io.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups, profile }) => {
        const orgList = lookups.data?.orgs ?? [];
        this.orgs.set(orgList);
        const user = this.auth.currentUser();
        const defaultOrg =
          isAttendanceOnlyUser(user?.userRoleId) && user?.schoolId
            ? user.schoolId
            : resolveDefaultSchoolOrgId(orgList, profile as UserProfile);
        this.orgId.set(defaultOrg);
        if (defaultOrg) this.load();
        else this.loading.set(false);
      });
  }

  onOrgChange(orgId: number | null): void {
    this.orgId.set(orgId);
    if (orgId) this.load();
    else this.rows.set([]);
  }

  onFilterChange(value: string): void {
    this.filterStatus.set(value);
    this.load();
  }

  load(): void {
    const orgId = this.orgId();
    if (!orgId) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const status = this.filterStatus() || null;
    this.attendance.getLeaveRequests(orgId, status).subscribe((list) => {
      this.rows.set(list);
      this.loading.set(false);
    });
  }

  review(id: number, status: 'approved' | 'rejected'): void {
    const orgId = this.orgId();
    if (!orgId) return;
    let comment: string | undefined;
    if (status === 'rejected') {
      const input = prompt('Rejection reason (optional):');
      if (input === null) return;
      comment = input.trim() || undefined;
    }
    this.busyId.set(id);
    this.attendance.reviewLeaveRequest(id, orgId, status, comment).subscribe(({ success, message }) => {
      this.busyId.set(null);
      if (!success) {
        this.errorMessage.set(message ?? 'Review failed.');
        return;
      }
      this.toast.showSuccess(status === 'approved' ? 'Leave approved.' : 'Leave rejected.');
      this.load();
    });
  }

  statusClass(status: string): string {
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'danger';
    if (status === 'pending') return 'warning';
    return 'muted';
  }
}
