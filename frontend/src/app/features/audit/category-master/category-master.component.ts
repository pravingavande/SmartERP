import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditLookups } from '../../../core/models/audit.model';
import { CategoryFormState, CategoryMasterItem } from '../../../core/models/master.model';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MasterService } from '../../../core/services/master.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateCategoryForm } from '../../../core/utils/master-validation.util';
import { ImportLanguage, matchesImportLanguage } from '../../../core/utils/import-language.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { resolveDefaultSansthaOrgId, resolveSansthaOrgs } from '../../../core/utils/org-access.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-category-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent],
  templateUrl: './category-master.component.html',
  styleUrl: './category-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryMasterComponent {
  private readonly master = inject(MasterService);
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
  readonly items = signal<CategoryMasterItem[]>([]);
  readonly form = signal<CategoryFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly importVisible = signal(false);
  readonly importLoading = signal(false);
  readonly importSourceLoading = signal(false);
  readonly importSourceItems = signal<CategoryMasterItem[]>([]);
  readonly importSelectedIds = signal<Set<number>>(new Set());
  readonly importLanguage = signal<ImportLanguage>('M');
  readonly listOrgID = signal<number | null>(null);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof CategoryMasterItem>('categoryName');
  readonly sortDir = signal<SortDirection>('asc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  private static readonly ImportSourceOrgID = 1;

  readonly sansthaOrgs = computed(() => this.lookups()?.sansthaOrgs ?? []);
  readonly canImport = computed(() => {
    const orgId = this.listOrgID();
    return orgId != null && orgId > 0 && orgId !== CategoryMasterComponent.ImportSourceOrgID;
  });
  readonly importSelectedCount = computed(() => this.importSelectedIds().size);
  readonly filteredImportSourceItems = computed(() => {
    const lang = this.importLanguage();
    return this.importSourceItems().filter((item) => matchesImportLanguage(item.categoryName, lang));
  });
  readonly importAllSelected = computed(() => {
    const items = this.filteredImportSourceItems();
    const selected = this.importSelectedIds();
    return items.length > 0 && items.every((x) => selected.has(x.categoryID));
  });
  readonly selectedOrgName = computed(() => {
    const orgId = this.listOrgID();
    return this.sansthaOrgs().find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });

  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = this.items();
    if (q) rows = rows.filter((x) => x.categoryName.toLowerCase().includes(q));
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
    this.master
      .getCategories(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.listLoading.set(false);
          this.items.set(list);
          this.listPageIndex.set(0);
        },
        error: (err: Error) => {
          this.listLoading.set(false);
          this.errorMessage.set(err.message ?? 'Unable to load categories.');
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.listPageIndex.set(0);
  }

  toggleSort(key: keyof CategoryMasterItem): void {
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
      this.errorMessage.set('Select Org / Sanstha on the list page before adding new.');
      return;
    }
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({ ...this.emptyForm(), underOrgID: orgId });
  }

  editItem(item: CategoryMasterItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      categoryID: item.categoryID,
      underOrgID: item.underOrgID,
      categoryName: item.categoryName,
      isActive: item.isActive
    });
  }

  deleteItem(item: CategoryMasterItem): void {
    if (!confirm(`Deactivate category "${item.categoryName}"?`)) return;
    this.master.deleteCategory(item.categoryID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to delete category.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Category deactivated.', 'Deleted');
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
      this.errorMessage.set('Select Org / Sanstha before importing.');
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
      .getCategories(CategoryMasterComponent.ImportSourceOrgID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.importSourceLoading.set(false);
          const active = list.filter((x) => x.isActive !== false);
          this.importSourceItems.set(active);
          if (!active.length) {
            this.toast.showError('No source categories found in organization 1.', 'Import');
          }
        },
        error: (err: Error) => {
          this.importSourceLoading.set(false);
          this.toast.showError(err.message ?? 'Unable to load source categories.', 'Import failed');
        }
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
    const visibleIds = new Set(this.filteredImportSourceItems().map((x) => x.categoryID));
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
    this.importSelectedIds.set(new Set(this.filteredImportSourceItems().map((x) => x.categoryID)));
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
      this.toast.showError('Select at least one category to import.', 'Import');
      return;
    }

    this.importLoading.set(true);
    this.master
      .importCategories(orgId, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.importLoading.set(false);
        if (!data) {
          this.toast.showError(message ?? 'Unable to import categories.', 'Import failed');
          return;
        }
        this.closeImport();
        this.loadList();
        this.toast.showSuccess(
          message ?? `Imported ${data.importedCount} category(s). Skipped ${data.skippedCount}.`,
          'Imported'
        );
      });
  }

  updateForm<K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save(): void {
    const f = this.form();
    const errors = validateCategoryForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }
    this.loading.set(true);
    this.master.saveCategory(f).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.fieldErrors.set(mapBackendMessageToFieldErrors(message));
        this.saveError.set(message ?? 'Unable to save category.');
        toastOnSave(this.toast, false, { entity: 'Category', mode: this.formMode(), errorMessage: message ?? 'Unable to save category.' });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Category', mode: this.formMode() });
      this.closeForm();
      this.loadList();
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private emptyForm(): CategoryFormState {
    return { categoryID: null, underOrgID: null, categoryName: '', isActive: true };
  }
}
