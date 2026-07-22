import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClassFormState, ClassMasterItem, InventoryLookups } from '../../../core/models/master.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MasterService } from '../../../core/services/master.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection, filterMasterListByStatus } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateClassForm } from '../../../core/utils/master-validation.util';
import { ImportLanguage, matchesImportLanguage } from '../../../core/utils/import-language.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-class-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent, OrgSchoolSelectComponent],
  templateUrl: './class-master.component.html',
  styleUrl: './class-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassMasterComponent {
  private readonly master = inject(MasterService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<InventoryLookups | null>(null);
  readonly items = signal<ClassMasterItem[]>([]);
  readonly form = signal<ClassFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly importVisible = signal(false);
  readonly importLoading = signal(false);
  readonly importSourceLoading = signal(false);
  readonly importSourceItems = signal<ClassMasterItem[]>([]);
  readonly importSelectedIds = signal<Set<number>>(new Set());
  readonly importLanguage = signal<ImportLanguage>('M');
  readonly listOrgID = signal<number | null>(null);
  readonly listStatusActive = signal(true);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof ClassMasterItem>('srNo');
  readonly sortDir = signal<SortDirection>('asc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  private static readonly ImportSourceOrgID = 1;

  readonly canImport = computed(() => {
    const orgId = this.listOrgID();
    return orgId != null && orgId > 0 && orgId !== ClassMasterComponent.ImportSourceOrgID;
  });
  readonly importSelectedCount = computed(() => this.importSelectedIds().size);
  readonly filteredImportSourceItems = computed(() => {
    const lang = this.importLanguage();
    return this.importSourceItems().filter((item) => matchesImportLanguage(item.className, lang));
  });
  readonly importAllSelected = computed(() => {
    const items = this.filteredImportSourceItems();
    const selected = this.importSelectedIds();
    return items.length > 0 && items.every((x) => selected.has(x.classID));
  });
  readonly selectedOrgName = computed(() => {
    const orgId = this.listOrgID();
    return this.lookups()?.orgs?.find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });

  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = filterMasterListByStatus(this.items(), this.listStatusActive());
    if (q) rows = rows.filter((x) => x.className.toLowerCase().includes(q));
    return sortRows(rows, this.sortKey(), this.sortDir());
  });
  readonly listPageCount = computed(() => pageCount(this.filteredItems().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.filteredItems(), this.listPageIndex(), this.listPageSize()));
  readonly listPageStart = computed(() => pageRange(this.filteredItems().length, this.listPageIndex(), this.listPageSize()).start);
  readonly listPageEnd = computed(() => pageRange(this.filteredItems().length, this.listPageIndex(), this.listPageSize()).end);

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.master.getInventoryLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data?.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
          return;
        }
        const orgId = resolveDefaultSchoolOrgId(data.orgs, profile);
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
    this.master
      .getClasses(orgId)
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

  toggleSort(key: keyof ClassMasterItem): void {
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
      this.errorMessage.set('Select Org / School on the list page before adding new.');
      return;
    }
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({ ...this.emptyForm(), orgID: orgId });
    this.loadNextSrNo(orgId);
  }

  editItem(item: ClassMasterItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      classID: item.classID,
      orgID: item.orgID,
      srNo: item.srNo,
      className: item.className,
      isActive: item.isActive
    });
  }

  deleteItem(item: ClassMasterItem): void {
    if (!confirm(`Deactivate class "${item.className}"?`)) return;
    this.master.deleteClass(item.classID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to delete class.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Class deactivated.', 'Deleted');
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
      this.errorMessage.set('Select Org / School before importing.');
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
    this.master
      .getClasses(ClassMasterComponent.ImportSourceOrgID)
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
    const visibleIds = new Set(this.filteredImportSourceItems().map((x) => x.classID));
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
    this.importSelectedIds.set(new Set(this.filteredImportSourceItems().map((x) => x.classID)));
  }

  unselectAllImport(): void {
    this.importSelectedIds.set(new Set());
  }

  confirmImport(): void {
    const orgId = this.listOrgID();
    const ids = Array.from(this.importSelectedIds());
    if (!orgId || !this.canImport()) {
      this.toast.showError('Select a destination organization first.', 'Import');
      return;
    }
    if (!ids.length) {
      this.toast.showError('Select at least one class to import.', 'Import');
      return;
    }

    this.importLoading.set(true);
    this.master
      .importClasses(orgId, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.importLoading.set(false);
        if (!data) {
          this.toast.showError(message ?? 'Unable to import classes.', 'Import failed');
          return;
        }
        this.closeImport();
        this.loadList();
        this.toast.showSuccess(
          message ?? `Imported ${data.importedCount} class(es). Skipped ${data.skippedCount}.`,
          'Imported'
        );
      });
  }

  onFormOrgChange(orgId: number | null): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'orgID'));
    this.form.update((f) => ({ ...f, orgID: orgId }));
    this.listOrgID.set(orgId);
    if (this.formMode() === 'new' && orgId) this.loadNextSrNo(orgId);
  }

  updateForm<K extends keyof ClassFormState>(key: K, value: ClassFormState[K]): void {
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
    const errors = validateClassForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }
    this.loading.set(true);
    this.master.saveClass(f).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.fieldErrors.set(mapBackendMessageToFieldErrors(message));
        this.saveError.set(message ?? 'Unable to save class.');
        toastOnSave(this.toast, false, { entity: 'Class', mode: this.formMode(), errorMessage: message ?? 'Unable to save class.' });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Class', mode: this.formMode() });
      this.closeForm();
      this.loadList();
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private loadNextSrNo(orgId: number): void {
    this.master.getClassNextSrNo(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((srNo) => {
      if (srNo != null) this.form.update((f) => ({ ...f, srNo }));
    });
  }

  private emptyForm(): ClassFormState {
    return { classID: null, orgID: null, srNo: null, className: '', isActive: true };
  }
}
