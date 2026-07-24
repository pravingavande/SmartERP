import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AttendanceRecord } from '../../../core/models/attendance.model';
import { OrgOption } from '../../../core/models/audit.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IoRegisterService } from '../../../core/services/io-register.service';
import { isAttendanceOnlyUser, resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { todayIsoDate } from '../../../core/utils/date.util';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';

@Component({
  selector: 'app-attendance-records',
  imports: [FormsModule, DatePipe, OrgSchoolSelectComponent],
  templateUrl: './records.component.html',
  styleUrl: './records.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceRecordsComponent {
  private readonly attendance = inject(AttendanceService);
  private readonly io = inject(IoRegisterService);
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<AttendanceRecord[]>([]);
  readonly loading = signal(true);
  readonly orgs = signal<OrgOption[]>([]);
  readonly orgId = signal<number | null>(null);
  readonly filterDate = signal(todayIsoDate());

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
        if (defaultOrg) this.loadRecords();
        else this.loading.set(false);
      });
  }

  onOrgChange(orgId: number | null): void {
    this.orgId.set(orgId);
    if (orgId) this.loadRecords();
    else this.rows.set([]);
  }

  onDateChange(value: string): void {
    this.filterDate.set(value);
    this.loadRecords();
  }

  loadRecords(): void {
    const orgId = this.orgId();
    if (!orgId) return;
    const date = this.filterDate();
    this.loading.set(true);
    this.attendance.getRecords(orgId, date, date).subscribe((list) => {
      this.rows.set(list);
      this.loading.set(false);
    });
  }

  formatTime(iso?: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
    } catch {
      return '—';
    }
  }
}
