import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditLookups } from '../../../core/models/audit.model';
import { DocumentFormState, DocumentMasterItem } from '../../../core/models/master.model';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MasterService } from '../../../core/services/master.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateDocumentForm } from '../../../core/utils/master-validation.util';
import { ImportLanguage, matchesImportLanguage } from '../../../core/utils/import-language.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { resolveDefaultSansthaOrgId, resolveSansthaOrgs } from '../../../core/utils/org-access.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-document-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent],
  templateUrl: './document-master.component.html',
  styleUrl: './document-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentMasterComponent {
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
  readonly items = signal<DocumentMasterItem[]>([]);
  readonly form = signal<DocumentFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly importVisible = signal(false);
  readonly importLoading = signal(false);
  readonly importSourceLoading = signal(false);
  readonly importSourceItems = signal<DocumentMasterItem[]>([]);
  readonly importSelectedIds = signal<Set<number>>(new Set());
  readonly importLanguage = signal<ImportLanguage>('M');
  readonly listOrgID = signal<number | null>(null);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof DocumentMasterItem>('srNo');
  readonly sortDir = signal<SortDirection>('asc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  private static readonly ImportSourceOrgID = 1;

  readonly sansthaOrgs = computed(() => this.lookups()?.sansthaOrgs ?? []);
  readonly canImport = computed(() => {
    const orgId = this.listOrgID();
    return orgId != null && orgId > 0 && orgId !== DocumentMasterComponent.ImportSourceOrgID;
  });
  readonly importSelectedCount = computed(() => this.importSelectedIds().size);
  readonly filteredImportSourceItems = computed(() => {
    const lang = this.importLanguage();
    return this.importSourceItems().filter((item) => matchesImportLanguage(item.documentName, lang));
  });
  readonly importAllSelected = computed(() => {
    const items = this.filteredImportSourceItems();
    const selected = this.importSelectedIds();
    return items.length > 0 && items.every((x) => selected.has(x.documentID));
  });
  readonly selectedOrgName = computed(() => {
    const orgId = this.listOrgID();
    return this.sansthaOrgs().find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });

  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = this.items();
    if (q) rows = rows.filter((x) => x.documentName.toLowerCase().includes(q));
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
      .getDocuments(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.listLoading.set(false);
          this.items.set(list);
          this.listPageIndex.set(0);
        },
        error: (err: Error) => {
          this.listLoading.set(false);
          this.errorMessage.set(err.message ?? 'Unable to load documents.');
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.listPageIndex.set(0);
  }

  toggleSort(key: keyof DocumentMasterItem): void {
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
    this.loadNextSrNo(orgId);
  }

  editItem(item: DocumentMasterItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      documentID: item.documentID,
      underOrgID: item.underOrgID,
      srNo: item.srNo,
      documentName: item.documentName,
      isActive: item.isActive
    });
  }

  deleteItem(item: DocumentMasterItem): void {
    if (!confirm(`Deactivate document "${item.documentName}"?`)) return;
    this.master.deleteDocument(item.documentID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to delete document.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Document deactivated.', 'Deleted');
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
      .getDocuments(DocumentMasterComponent.ImportSourceOrgID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.importSourceLoading.set(false);
          const active = list.filter((x) => x.isActive !== false);
          this.importSourceItems.set(active);
          if (!active.length) {
            this.toast.showError('No source documents found in organization 1.', 'Import');
          }
        },
        error: (err: Error) => {
          this.importSourceLoading.set(false);
          this.toast.showError(err.message ?? 'Unable to load source documents.', 'Import failed');
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
    const visibleIds = new Set(this.filteredImportSourceItems().map((x) => x.documentID));
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
    this.importSelectedIds.set(new Set(this.filteredImportSourceItems().map((x) => x.documentID)));
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
      this.toast.showError('Select at least one document to import.', 'Import');
      return;
    }

    this.importLoading.set(true);
    this.master
      .importDocuments(orgId, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.importLoading.set(false);
        if (!data) {
          this.toast.showError(message ?? 'Unable to import documents.', 'Import failed');
          return;
        }
        this.closeImport();
        this.loadList();
        this.toast.showSuccess(
          message ?? `Imported ${data.importedCount} document(s). Skipped ${data.skippedCount}.`,
          'Imported'
        );
      });
  }

  updateForm<K extends keyof DocumentFormState>(key: K, value: DocumentFormState[K]): void {
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
    const errors = validateDocumentForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }
    this.loading.set(true);
    this.master.saveDocument(f).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.fieldErrors.set(mapBackendMessageToFieldErrors(message));
        this.saveError.set(message ?? 'Unable to save document.');
        toastOnSave(this.toast, false, { entity: 'Document', mode: this.formMode(), errorMessage: message ?? 'Unable to save document.' });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Document', mode: this.formMode() });
      this.closeForm();
      this.loadList();
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private loadNextSrNo(orgId: number): void {
    this.master.getDocumentNextSrNo(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((srNo) => {
      if (srNo != null) this.form.update((f) => ({ ...f, srNo }));
    });
  }

  private emptyForm(): DocumentFormState {
    return { documentID: null, underOrgID: null, srNo: null, documentName: '', isActive: true };
  }
}
