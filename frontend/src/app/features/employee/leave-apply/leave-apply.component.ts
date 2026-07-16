import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LeaveApplyFormState, LeaveApplyListItem, LeaveApplyLookupsBundle, EmployeeOption } from '../../../core/models/leave.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { LeaveService } from '../../../core/services/leave.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors } from '../../../core/utils/form-field-errors';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { todayIsoDate } from '../../../core/utils/date.util';
import { resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-leave-apply',
  imports: [FormsModule, DatePipe, ListActionBtnComponent, OrgSchoolSelectComponent],
  templateUrl: './leave-apply.component.html',
  styleUrl: './leave-apply.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveApplyComponent {
  private readonly leaveService = inject(LeaveService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<LeaveApplyLookupsBundle | null>(null);
  readonly items = signal<LeaveApplyListItem[]>([]);
  readonly employees = signal<EmployeeOption[]>([]);
  readonly form = signal<LeaveApplyFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly listOrgID = signal<number | null>(null);
  readonly listAyID = signal<number | null>(null);
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly masterLookups = computed(() => this.lookups()?.lookups);
  /** Same as Teacher Master — orgs already filtered in LeaveService via auth.filterSchoolOrgs. */
  readonly schoolOrgs = computed(() => this.lookups()?.orgs ?? []);
  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly paginatedItems = computed(() => {
    const list = this.items();
    const start = this.listPageIndex() * this.listPageSize();
    return list.slice(start, start + this.listPageSize());
  });
  readonly listPageCount = computed(() => Math.max(1, Math.ceil(this.items().length / this.listPageSize())));
  readonly listPageStart = computed(() => {
    const total = this.items().length;
    if (!total) return 0;
    return this.listPageIndex() * this.listPageSize() + 1;
  });
  readonly listPageEnd = computed(() => {
    const total = this.items().length;
    if (!total) return 0;
    return Math.min(total, (this.listPageIndex() + 1) * this.listPageSize());
  });

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      lookups: this.leaveService.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data) {
          this.errorMessage.set('Unable to load leave masters. Please refresh or contact admin.');
          this.items.set([]);
          return;
        }
        if (!data.orgs?.length) {
          this.errorMessage.set('No schools found for your login. Contact admin to map org access.');
          this.items.set([]);
          return;
        }
        const ayId = data.lookups.ayList[0]?.ayID ?? null;
        this.listAyID.set(ayId);
        // Same default selection as Teacher Master
        this.listOrgID.set(resolveDefaultSchoolOrgId(data.orgs, profile));
        this.loadList();
      });
  }

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
  }

  onListAyChange(ayId: number | null): void {
    this.listAyID.set(ayId);
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPageIndex.set(0);
  }

  goToListPage(index: number): void {
    const max = this.listPageCount() - 1;
    this.listPageIndex.set(Math.max(0, Math.min(index, max)));
  }

  loadList(): void {
    const orgId = this.listOrgID();
    // Same as Teacher Master — only load for selected school
    if (!orgId) {
      this.listLoading.set(false);
      this.items.set([]);
      this.listPageIndex.set(0);
      return;
    }
    this.listLoading.set(true);
    this.leaveService
      .getList(orgId, this.listAyID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.listLoading.set(false);
        this.items.set(list);
        const maxPage = Math.max(0, Math.ceil(list.length / this.listPageSize()) - 1);
        if (this.listPageIndex() > maxPage) this.listPageIndex.set(maxPage);
      });
  }

  newEntry(): void {
    const orgId =
      this.listOrgID() ?? resolveDefaultSchoolOrgId(this.schoolOrgs(), null);
    const ayId = this.listAyID();
    if (!orgId) {
      this.errorMessage.set('Select a school on the list page before adding a new leave.');
      return;
    }
    if (!ayId) {
      this.errorMessage.set('Select Academic Year on the list page before adding new.');
      return;
    }
    this.errorMessage.set(null);
    this.formMode.set('new');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set(this.emptyForm(orgId, ayId));
    this.loadEmployees(orgId);
    this.leaveService
      .getNextRecordNo(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((recordNo) => this.form.update((f) => ({ ...f, recordNo })));
  }

  editEntry(item: LeaveApplyListItem): void {
    this.loading.set(true);
    this.leaveService
      .getById(item.userLeaveApplyID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.loading.set(false);
        if (!data) {
          this.errorMessage.set('Unable to load leave application.');
          return;
        }
        this.formMode.set('edit');
        this.formVisible.set(true);
        this.fieldErrors.set({});
        this.saveError.set(null);
        this.form.set(data);
        if (data.orgID) this.loadEmployees(data.orgID);
      });
  }

  viewEntry(item: LeaveApplyListItem): void {
    this.editEntry(item);
    this.formMode.set('view');
  }

  cancel(): void {
    this.closeForm();
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.loadList();
  }

  onFormOrgChange(orgId: number | null): void {
    this.form.update((f) => ({ ...f, orgID: orgId, userID: null }));
    if (orgId) this.loadEmployees(orgId);
    else this.employees.set([]);
  }

  onDateRangeChange(): void {
    const f = this.form();
    const noOfDay = this.leaveService.calcNoOfDays(f.fromDate, f.toDate);
    this.form.update((x) => ({ ...x, noOfDay }));
  }

  updateForm<K extends keyof LeaveApplyFormState>(key: K, value: LeaveApplyFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    if (key === 'fromDate' || key === 'toDate') this.onDateRangeChange();
  }

  save(): void {
    if (this.isViewMode()) return;
    const f = this.form();
    const errors: FieldErrors = {};
    if (!f.orgID) errors['orgID'] = 'Org / School is required.';
    if (!f.userID) errors['userID'] = 'Employee is required.';
    if (!f.leaveTypeID) errors['leaveTypeID'] = 'Leave type is required.';
    if (!f.fromDate) errors['fromDate'] = 'From date is required.';
    if (!f.toDate) errors['toDate'] = 'To date is required.';
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }

    this.loading.set(true);
    this.saveError.set(null);
    this.fieldErrors.set({});
    this.leaveService
      .save({ ...f, ayID: f.ayID ?? this.listAyID() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('Unable to save leave application.');
          toastOnSave(this.toast, false, { entity: 'Leave application', mode: this.formMode(), errorMessage: 'Unable to save leave application.' });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Leave application', mode: this.formMode() });
        this.closeForm();
      });
  }

  employeeName(item: LeaveApplyListItem): string {
    return item.displayName || [item.firstname, item.middleName, item.lastName].filter(Boolean).join(' ');
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private loadEmployees(orgId: number): void {
    this.leaveService
      .getEmployees(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.employees.set(list));
  }

  private emptyForm(orgId: number | null = null, ayId: number | null = null): LeaveApplyFormState {
    return {
      userLeaveApplyID: null,
      orgID: orgId,
      recordNo: null,
      tDate: todayIsoDate(),
      userID: null,
      leaveTypeID: null,
      leaveReason: '',
      fromDate: todayIsoDate(),
      toDate: todayIsoDate(),
      noOfDay: null,
      adminRemak: '',
      leavePermissionID: null,
      ayID: ayId
    };
  }
}
