import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AttendancePayrollRow } from '../../../core/models/attendance.model';
import { OrgOption } from '../../../core/models/audit.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IoRegisterService } from '../../../core/services/io-register.service';
import { isAttendanceOnlyUser, resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';

@Component({
  selector: 'app-attendance-payroll',
  imports: [FormsModule, OrgSchoolSelectComponent],
  templateUrl: './payroll.component.html',
  styleUrl: './payroll.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendancePayrollComponent {
  private readonly attendance = inject(AttendanceService);
  private readonly io = inject(IoRegisterService);
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<AttendancePayrollRow[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly orgs = signal<OrgOption[]>([]);
  readonly orgId = signal<number | null>(null);
  readonly monthInput = signal(this.currentMonthInput());

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

  currentMonthInput(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  onOrgChange(orgId: number | null): void {
    this.orgId.set(orgId);
    if (orgId) this.load();
    else this.rows.set([]);
  }

  onMonthChange(value: string): void {
    this.monthInput.set(value);
    this.load();
  }

  load(): void {
    const orgId = this.orgId();
    if (!orgId) return;
    const [y, m] = this.monthInput().split('-').map(Number);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.attendance.getTeamPayroll(orgId, y, m).subscribe((list) => {
      this.rows.set(list);
      this.loading.set(false);
      if (!list.length) this.errorMessage.set('No payroll data found. Configure employee salaries in Attendance profiles.');
    });
  }

  formatInr(v?: number): string {
    if (v == null || !Number.isFinite(v)) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  }
}
