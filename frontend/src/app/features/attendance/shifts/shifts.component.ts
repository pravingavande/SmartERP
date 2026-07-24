import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AttendanceShift, SaveAttendanceShiftPayload } from '../../../core/models/attendance.model';
import { OrgOption } from '../../../core/models/audit.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IoRegisterService } from '../../../core/services/io-register.service';
import { ToastService } from '../../../core/services/toast.service';
import { isAttendanceOnlyUser, resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ShiftFormState {
  shiftName: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  timingMode: string;
  requiredHours: number;
  lunchMinutes: number;
  graceMinutes: number;
  earlyCheckinMinutes: number;
  isNightShift: boolean;
  isActive: boolean;
}

@Component({
  selector: 'app-attendance-shifts',
  imports: [FormsModule, OrgSchoolSelectComponent, ListActionBtnComponent],
  templateUrl: './shifts.component.html',
  styleUrl: './shifts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceShiftsComponent {
  private readonly attendance = inject(AttendanceService);
  private readonly io = inject(IoRegisterService);
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly shifts = signal<AttendanceShift[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formVisible = signal(false);
  readonly editing = signal<AttendanceShift | null>(null);
  readonly orgs = signal<OrgOption[]>([]);
  readonly orgId = signal<number | null>(null);
  readonly dayLabels = DAY_LABELS;
  weekdays = [true, true, true, true, true, true, false];
  form: ShiftFormState = this.emptyForm();

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
        if (defaultOrg) this.loadShifts(defaultOrg);
        else {
          this.loading.set(false);
          this.errorMessage.set('Select an organization to manage shifts.');
        }
      });
  }

  onOrgChange(orgId: number | null): void {
    this.orgId.set(orgId);
    if (orgId) this.loadShifts(orgId);
    else {
      this.shifts.set([]);
      this.loading.set(false);
    }
  }

  loadShifts(orgId: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.attendance.getShifts(orgId).subscribe((list) => {
      this.shifts.set(list);
      this.loading.set(false);
    });
  }

  formatRequired(minutes?: number | null): string {
    if (!minutes) return '8h';
    const h = Math.floor(minutes / 60);
    const min = minutes % 60;
    return min ? `${h}h ${min}m` : `${h}h`;
  }

  openForm(shift?: AttendanceShift): void {
    this.formError.set(null);
    this.editing.set(shift ?? null);
    if (shift) {
      const reqMin = shift.requiredWorkMinutes ?? 480;
      this.form = {
        shiftName: shift.shiftName,
        shiftCode: shift.shiftCode,
        startTime: shift.startTime,
        endTime: shift.endTime,
        timingMode: shift.timingMode || 'fixed',
        requiredHours: reqMin % 60 === 0 ? reqMin / 60 : Math.round((reqMin / 60) * 10) / 10,
        lunchMinutes: shift.lunchMinutes ?? 60,
        graceMinutes: shift.graceMinutes ?? 15,
        earlyCheckinMinutes: shift.earlyCheckinMinutes ?? 60,
        isNightShift: shift.isNightShift ?? false,
        isActive: shift.isActive !== false
      };
      const wd = (shift.workingDays ?? '1111100').padEnd(7, '0');
      this.weekdays = wd.split('').map((c) => c === '1');
    } else {
      this.form = this.emptyForm();
      this.weekdays = [true, true, true, true, true, true, false];
    }
    this.formVisible.set(true);
  }

  closeForm(): void {
    this.formVisible.set(false);
  }

  saveForm(): void {
    const orgId = this.orgId();
    if (!orgId) return;
    this.formError.set(null);
    if (!this.form.shiftName.trim() || !this.form.shiftCode.trim()) {
      this.formError.set('Name and code are required.');
      return;
    }
    if (this.form.requiredHours <= 0) {
      this.formError.set('Required hours must be greater than zero.');
      return;
    }

    const payload: SaveAttendanceShiftPayload = {
      orgID: orgId,
      shiftName: this.form.shiftName.trim(),
      shiftCode: this.form.shiftCode.trim().toUpperCase(),
      startTime: this.form.startTime,
      endTime: this.form.endTime,
      timingMode: this.form.timingMode,
      requiredWorkMinutes: Math.round(this.form.requiredHours * 60),
      lunchMinutes: this.form.lunchMinutes,
      isNightShift: this.form.isNightShift,
      workingDays: this.weekdays.map((on) => (on ? '1' : '0')).join('')
    };
    if (this.form.timingMode === 'fixed') {
      payload.graceMinutes = this.form.graceMinutes;
      payload.earlyCheckinMinutes = this.form.earlyCheckinMinutes;
    }
    const edit = this.editing();
    if (edit) payload.isActive = this.form.isActive;

    this.saving.set(true);
    const req = edit
      ? this.attendance.updateShift(edit.shiftID, payload)
      : this.attendance.createShift(payload);
    req.subscribe(({ data, message }) => {
      this.saving.set(false);
      if (!data) {
        this.formError.set(message ?? 'Could not save shift.');
        return;
      }
      this.toast.showSuccess(edit ? 'Shift updated.' : 'Shift created.');
      this.closeForm();
      this.loadShifts(orgId);
    });
  }

  deleteForm(): void {
    const edit = this.editing();
    const orgId = this.orgId();
    if (!edit || !orgId || !confirm(`Delete shift "${edit.shiftName}"?`)) return;
    this.saving.set(true);
    this.attendance.deleteShift(edit.shiftID, orgId).subscribe(({ success, message }) => {
      this.saving.set(false);
      if (!success) {
        this.formError.set(message ?? 'Could not delete shift.');
        return;
      }
      this.toast.showSuccess('Shift deleted.');
      this.closeForm();
      this.loadShifts(orgId);
    });
  }

  private emptyForm(): ShiftFormState {
    return {
      shiftName: '',
      shiftCode: '',
      startTime: '09:00',
      endTime: '18:00',
      timingMode: 'fixed',
      requiredHours: 8,
      lunchMinutes: 60,
      graceMinutes: 15,
      earlyCheckinMinutes: 60,
      isNightShift: false,
      isActive: true
    };
  }
}
