import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditLookups } from '../../../core/models/audit.model';
import { LeaveTypeFormState, LeaveTypeItem } from '../../../core/models/leave.model';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { LeaveService } from '../../../core/services/leave.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, paginateRows, sortRows, SortDirection, filterMasterListByStatus } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateLeaveTypeForm } from '../../../core/utils/master-validation.util';
import { ImportLanguage, matchesImportLanguage } from '../../../core/utils/import-language.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { resolveDefaultSansthaOrgId, resolveSansthaOrgs } from '../../../core/utils/org-access.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-leave-type-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent],
  templateUrl: './leave-type-master.component.html',
  styleUrl: './leave-type-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveTypeMasterComponent {
  private readonly leaveService = inject(LeaveService);
  private readonly audit = inject(AuditService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<AuditLookups | null>(null);
  readonly items = signal<LeaveTypeItem[]>([]);
  readonly form = signal<LeaveTypeFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly importVisible = signal(false);
  readonly importLoading = signal(false);
  readonly importSourceLoading = signal(false);
  readonly importSourceItems = signal<LeaveTypeItem[]>([]);
  readonly importSelectedIds = signal<Set<number>>(new Set());
  readonly importLanguage = signal<ImportLanguage>('M');
  readonly listOrgID = signal<number | null>(null);
  readonly listStatusActive = signal(true);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof LeaveTypeItem>('srNo');
  readonly sortDir = signal<SortDirection>('asc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  private static readonly ImportSourceOrgID = 1;

  readonly sansthaOrgs = computed(() => this.lookups()?.sansthaOrgs ?? []);
  readonly canImport = computed(() => {
    const orgId = this.listOrgID();
    return orgId != null && orgId > 0 && orgId !== LeaveTypeMasterComponent.ImportSourceOrgID;
  });
  readonly importSelectedCount = computed(() => this.importSelectedIds().size);
  readonly filteredImportSourceItems = computed(() => {
    const lang = this.importLanguage();
    return this.importSourceItems().filter((item) => matchesImportLanguage(item.leaveTypeName, lang));
  });
  readonly importAllSelected = computed(() => {
    const items = this.filteredImportSourceItems();
    const selected = this.importSelectedIds();
    return items.length > 0 && items.every((x) => selected.has(x.leaveTypeID));
  });
  readonly selectedOrgName = computed(() => {
    const orgId = this.listOrgID();
    return this.sansthaOrgs().find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });

  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = filterMasterListByStatus(this.items(), this.listStatusActive());
    if (q) rows = rows.filter((x) => x.leaveTypeName.toLowerCase().includes(q));
    return sortRows(rows, this.sortKey(), this.sortDir());
  });
  readonly listPageCount = computed(() => pageCount(this.filteredItems().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.filteredItems(), this.listPageIndex(), this.listPageSize()));

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.audit.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        const sansthaOrgs = resolveSansthaOrgs(data?.sansthaOrgs ?? [], this.auth.currentUser());
        this.lookups.set(data ? { ...data, sansthaOrgs } : null);
        if (!sansthaOrgs.length) {
          this.errorMessage.set('No Sanstha found for your login.');
          return;
        }
        const orgId = resolveDefaultSansthaOrgId(sansthaOrgs, profile, this.auth.currentUser());
        this.listOrgID.set(orgId);
        if (orgId) this.loadList();
      });
  }

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listPageIndex.set(0);
    this.closeForm();
    this.closeImport();
    if (orgId) this.loadList();
    else this.items.set([]);
  }

  loadList(): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.listLoading.set(true);
    this.leaveService
      .getLeaveTypes(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.listLoading.set(false);
        this.items.set(list);
        this.listPageIndex.set(0);
      });
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.listPageIndex.set(0);
  }

  onListStatusChange(active: boolean): void {
    this.listStatusActive.set(active);
    this.listPageIndex.set(0);
  }

  toggleSort(key: keyof LeaveTypeItem): void {
    if (this.sortKey() === key) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  goToListPage(index: number): void {
    const max = this.listPageCount() - 1;
    this.listPageIndex.set(Math.max(0, Math.min(index, max)));
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPageIndex.set(0);
  }

  newItem(): void {
    const orgId = this.listOrgID();
    if (!orgId) {
      this.errorMessage.set('Select Sanstha on the list page before adding new.');
      return;
    }
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({ ...this.emptyForm(), underOrgID: orgId });
    this.loadNextSrNo(orgId);
  }

  editItem(item: LeaveTypeItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      leaveTypeID: item.leaveTypeID,
      underOrgID: item.underOrgID,
      srNo: item.srNo,
      leaveTypeName: item.leaveTypeName,
      isActive: item.isActive
    });
  }

  deleteItem(item: LeaveTypeItem): void {
    if (!confirm(`Deactivate leave type "${item.leaveTypeName}"?`)) return;
    this.leaveService.deleteLeaveType(item.leaveTypeID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to delete leave type.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Leave type deactivated.', 'Deleted');
      this.loadList();
    });
  }

  cancel(): void {
    this.closeForm();
    this.errorMessage.set(null);
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  openImport(): void {
    const orgId = this.listOrgID();
    if (!orgId) {
      this.errorMessage.set('Select Sanstha before importing.');
      return;
    }
    if (!this.canImport()) {
      this.errorMessage.set('Import is not available for the source organization.');
      return;
    }
    this.closeForm();
    this.importVisible.set(true);
    this.importLanguage.set('M');
    this.importSelectedIds.set(new Set());
    this.importSourceLoading.set(true);
    this.leaveService
      .getLeaveTypes(LeaveTypeMasterComponent.ImportSourceOrgID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.importSourceLoading.set(false);
        this.importSourceItems.set(list.filter((x) => x.isActive !== false));
      });
  }

  closeImport(): void {
    this.importVisible.set(false);
    this.importLoading.set(false);
    this.importSourceLoading.set(false);
    this.importSourceItems.set([]);
    this.importSelectedIds.set(new Set());
    this.importLanguage.set('M');
  }

  onImportLanguageChange(lang: ImportLanguage): void {
    this.importLanguage.set(lang);
    const visibleIds = new Set(this.filteredImportSourceItems().map((x) => x.leaveTypeID));
    this.importSelectedIds.update((selected) => {
      const next = new Set<number>();
      for (const id of selected) {
        if (visibleIds.has(id)) next.add(id);
      }
      return next;
    });
  }

  toggleImportItem(id: number, checked: boolean): void {
    this.importSelectedIds.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  isImportSelected(id: number): boolean {
    return this.importSelectedIds().has(id);
  }

  selectAllImport(): void {
    this.importSelectedIds.set(new Set(this.filteredImportSourceItems().map((x) => x.leaveTypeID)));
  }

  unselectAllImport(): void {
    this.importSelectedIds.set(new Set());
  }

  confirmImport(): void {
    const orgId = this.listOrgID();
    const ids = Array.from(this.importSelectedIds());
    if (!orgId || !this.canImport()) {
      this.toast.showError('Select a destination Sanstha first.', 'Import');
      return;
    }
    if (!ids.length) {
      this.toast.showError('Select at least one leave type to import.', 'Import');
      return;
    }

    this.importLoading.set(true);
    this.leaveService
      .importLeaveTypes(orgId, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.importLoading.set(false);
        if (!data) {
          this.toast.showError(message ?? 'Unable to import leave types.', 'Import failed');
          return;
        }
        this.closeImport();
        this.loadList();
        this.toast.showSuccess(
          message ?? `Imported ${data.importedCount} leave type(s). Skipped ${data.skippedCount}.`,
          'Imported'
        );
      });
  }

  updateForm<K extends keyof LeaveTypeFormState>(key: K, value: LeaveTypeFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  onSrNoChange(value: string | number | null): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'srNo'));
    if (value === '' || value == null) {
      this.form.update((f) => ({ ...f, srNo: null }));
      return;
    }
    const n = typeof value === 'number' ? value : Number(value);
    this.form.update((f) => ({ ...f, srNo: Number.isFinite(n) ? n : null }));
  }

  save(): void {
    const f = this.form();
    const errors = validateLeaveTypeForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }
    this.loading.set(true);
    this.leaveService.saveLeaveType(f).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.fieldErrors.set(mapBackendMessageToFieldErrors(message));
        this.saveError.set(message ?? 'Unable to save leave type.');
        toastOnSave(this.toast, false, { entity: 'Leave type', mode: this.formMode(), errorMessage: message ?? 'Unable to save leave type.' });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Leave type', mode: this.formMode() });
      this.closeForm();
      this.loadList();
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private loadNextSrNo(orgId: number): void {
    this.leaveService.getLeaveTypeNextSrNo(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((srNo) => {
      if (srNo != null) this.form.update((f) => ({ ...f, srNo }));
    });
  }

  private emptyForm(): LeaveTypeFormState {
    return { leaveTypeID: null, underOrgID: null, srNo: null, leaveTypeName: '', isActive: true };
  }
}
