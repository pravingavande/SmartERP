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
import { ToastService } from '../../../core/services/toast.service';
import { isAttendanceOnlyUser, resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { todayIsoDate } from '../../../core/utils/date.util';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';

type CorrectionTab = 'reverse' | 'force_checkout';

@Component({
  selector: 'app-attendance-corrections',
  imports: [FormsModule, OrgSchoolSelectComponent],
  templateUrl: './corrections.component.html',
  styleUrl: './corrections.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceCorrectionsComponent {
  private readonly attendance = inject(AttendanceService);
  private readonly io = inject(IoRegisterService);
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly orgs = signal<OrgOption[]>([]);
  readonly orgId = signal<number | null>(null);

  activeTab: CorrectionTab = 'reverse';
  filterDate = todayIsoDate();
  selectedRecordId: number | null = null;
  eventType: 'check_in' | 'check_out' = 'check_in';
  reason = '';
  useCustomCheckoutTime = false;
  checkoutTime = this.nowTimeInput();

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
    this.selectedRecordId = null;
    if (orgId) this.loadRecords();
    else this.records.set([]);
  }

  private nowTimeInput(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  loadRecords(): void {
    const orgId = this.orgId();
    if (!orgId) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.attendance.getRecords(orgId, this.filterDate, this.filterDate).subscribe((list) => {
      this.records.set(list.filter((r) => r.checkInTime || r.checkOutTime));
      this.loading.set(false);
    });
  }

  onTabChange(tab: CorrectionTab): void {
    this.activeTab = tab;
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.selectedRecordId = null;
    this.reason = '';
  }

  onDateChange(): void {
    this.selectedRecordId = null;
    this.loadRecords();
  }

  selectedRecord(): AttendanceRecord | undefined {
    return this.records().find((r) => r.attendanceID === this.selectedRecordId);
  }

  reverseRecords(): AttendanceRecord[] {
    return this.records();
  }

  forceCheckoutRecords(): AttendanceRecord[] {
    return this.records().filter(
      (r) => !!r.checkInTime && !r.checkOutTime && !r.checkInPendingConfirmation
    );
  }

  formatTime(iso?: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  }

  checkoutAtIso(): string | undefined {
    if (!this.useCustomCheckoutTime) return undefined;
    const [h, m] = this.checkoutTime.split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
    const d = new Date(`${this.filterDate}T00:00:00+05:30`);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  submitReverse(): void {
    const orgId = this.orgId();
    if (!orgId) return;
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.selectedRecordId) {
      this.errorMessage.set('Select an attendance record.');
      return;
    }
    const rec = this.selectedRecord();
    if (!rec) return;
    if (this.eventType === 'check_in' && !rec.checkInTime) {
      this.errorMessage.set('This record has no check-in to reverse.');
      return;
    }
    if (this.eventType === 'check_out' && !rec.checkOutTime) {
      this.errorMessage.set('This record has no check-out to reverse.');
      return;
    }
    if (this.reason.trim().length < 3) {
      this.errorMessage.set('Enter a reason (at least 3 characters).');
      return;
    }
    this.saving.set(true);
    this.attendance
      .reverseAttendance(orgId, this.selectedRecordId, this.eventType, this.reason.trim())
      .subscribe(({ success, message }) => {
        this.saving.set(false);
        if (!success) {
          this.errorMessage.set(message ?? 'Could not reverse attendance.');
          return;
        }
        this.toast.showSuccess('Attendance reversed.');
        this.reason = '';
        this.selectedRecordId = null;
        this.loadRecords();
      });
  }

  submitForceCheckout(): void {
    const orgId = this.orgId();
    if (!orgId) return;
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.selectedRecordId) {
      this.errorMessage.set('Select an employee who is checked in.');
      return;
    }
    if (this.reason.trim().length < 3) {
      this.errorMessage.set('Enter a reason (at least 3 characters).');
      return;
    }
    if (!confirm('Force check-out this employee? This action is logged.')) return;

    this.saving.set(true);
    this.attendance
      .forceCheckout(orgId, this.selectedRecordId, this.reason.trim(), this.checkoutAtIso())
      .subscribe(({ success, message }) => {
        this.saving.set(false);
        if (!success) {
          this.errorMessage.set(message ?? 'Could not force check-out.');
          return;
        }
        this.toast.showSuccess('Employee checked out.');
        this.reason = '';
        this.selectedRecordId = null;
        this.useCustomCheckoutTime = false;
        this.checkoutTime = this.nowTimeInput();
        this.loadRecords();
      });
  }
}
