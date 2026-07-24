import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AttendanceMonthlyOffEmployeeRow,
  AttendanceMonthlyOffPlan,
  MonthlyOffOverride
} from '../../../core/models/attendance.model';
import { OrgOption } from '../../../core/models/audit.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IoRegisterService } from '../../../core/services/io-register.service';
import { ToastService } from '../../../core/services/toast.service';
import { isAttendanceOnlyUser, resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';

type CellState = {
  defaultOff: boolean;
  override: MonthlyOffOverride;
};

@Component({
  selector: 'app-attendance-monthly-week-off',
  imports: [FormsModule, OrgSchoolSelectComponent],
  templateUrl: './monthly-week-off.component.html',
  styleUrl: './monthly-week-off.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceMonthlyWeekOffComponent {
  private readonly attendance = inject(AttendanceService);
  private readonly io = inject(IoRegisterService);
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly plan = signal<AttendanceMonthlyOffPlan | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly orgs = signal<OrgOption[]>([]);
  readonly orgId = signal<number | null>(null);
  readonly monthInput = signal(this.currentMonthInput());
  readonly sundaysOnly = signal(false);
  readonly pendingCount = signal(0);
  readonly cells = signal<Map<string, CellState>>(new Map());

  private readonly pending = new Map<string, MonthlyOffOverride>();

  readonly visibleHeaders = computed(() => {
    const p = this.plan();
    if (!p) return [];
    return this.sundaysOnly() ? p.dayHeaders.filter((h) => h.isSunday) : p.dayHeaders;
  });

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
    else this.plan.set(null);
  }

  onMonth(value: string): void {
    this.monthInput.set(value);
    this.load();
  }

  load(): void {
    const orgId = this.orgId();
    if (!orgId) return;
    const [y, m] = this.monthInput().split('-').map((x) => parseInt(x, 10));
    this.loading.set(true);
    this.errorMessage.set(null);
    this.pending.clear();
    this.pendingCount.set(0);
    this.attendance.getMonthlyOffPlan(orgId, y, m).subscribe((data) => {
      if (!data) {
        this.errorMessage.set('Could not load monthly week-off plan.');
        this.loading.set(false);
        return;
      }
      this.plan.set(data);
      this.rebuildCells(data);
      this.loading.set(false);
    });
  }

  private rebuildCells(data: AttendanceMonthlyOffPlan): void {
    const map = new Map<string, CellState>();
    for (const emp of data.employees) {
      for (const day of emp.days) {
        const key = this.cellKey(emp.userID, day.date);
        const override = (day.override ?? 'default') as MonthlyOffOverride;
        map.set(key, { defaultOff: day.defaultOff, override });
      }
    }
    this.cells.set(map);
  }

  private cellKey(userId: number, date: string): string {
    return `${userId}|${date}`;
  }

  effectiveOff(userId: number, date: string): boolean {
    const state = this.cells().get(this.cellKey(userId, date));
    if (!state) return false;
    if (state.override === 'off') return true;
    if (state.override === 'working') return false;
    return state.defaultOff;
  }

  cellClass(userId: number, date: string): string {
    const key = this.cellKey(userId, date);
    const state = this.cells().get(key);
    if (!state) return 'monthly-off-cell';
    const pending = this.pending.has(key) ? ' cell-pending' : '';
    if (state.override === 'off') return `monthly-off-cell cell-off${pending}`;
    if (state.override === 'working') return `monthly-off-cell cell-working${pending}`;
    return `monthly-off-cell ${state.defaultOff ? 'cell-default-off' : 'cell-default-work'}${pending}`;
  }

  toggleCell(emp: AttendanceMonthlyOffEmployeeRow, date: string): void {
    const key = this.cellKey(emp.userID, date);
    const day = emp.days.find((d) => d.date === date);
    if (!day) return;

    const current = this.cells().get(key) ?? {
      defaultOff: day.defaultOff,
      override: (day.override ?? 'default') as MonthlyOffOverride
    };

    const next = this.nextOverride(current.override);
    const updated = new Map(this.cells());
    updated.set(key, { defaultOff: day.defaultOff, override: next });
    this.cells.set(updated);

    const serverOverride = (day.override ?? 'default') as MonthlyOffOverride;
    if (next === serverOverride) {
      this.pending.delete(key);
    } else {
      this.pending.set(key, next);
    }
    this.pendingCount.set(this.pending.size);
  }

  private nextOverride(current: MonthlyOffOverride): MonthlyOffOverride {
    if (current === 'default') return 'off';
    if (current === 'off') return 'working';
    return 'default';
  }

  save(): void {
    const orgId = this.orgId();
    const p = this.plan();
    if (!orgId || !p || !this.pending.size) return;

    const changes = [...this.pending.entries()].map(([key, override]) => {
      const [userId, date] = key.split('|');
      return { userID: Number(userId), date, override };
    });

    this.saving.set(true);
    this.errorMessage.set(null);
    this.attendance.saveMonthlyOffPlan(orgId, p.year, p.month, changes).subscribe(({ updated, message }) => {
      this.saving.set(false);
      if (!updated && message) {
        this.errorMessage.set(message);
        return;
      }
      this.toast.showSuccess(`Saved ${updated} change(s).`);
      this.load();
    });
  }

  discard(): void {
    const p = this.plan();
    if (!p) return;
    this.pending.clear();
    this.pendingCount.set(0);
    this.rebuildCells(p);
  }
}
