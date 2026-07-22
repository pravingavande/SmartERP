import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AuditLookups,
  LedgerHeadFormState,
  LedgerHeadMaster,
  LedgerTypeOption
} from '../../../core/models/audit.model';
import { AuditService } from '../../../core/services/audit.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ToastService } from '../../../core/services/toast.service';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { mapBackendMessageToFieldErrors, validateLedgerHeadForm } from '../../../core/utils/master-validation.util';
import { ImportLanguage, matchesImportLanguage } from '../../../core/utils/import-language.util';
import { resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { filterMasterListByStatus } from '../../../core/utils/master-list.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-ledger-head-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent, OrgSchoolSelectComponent],
  templateUrl: './ledger-head-master.component.html',
  styleUrl: './ledger-head-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LedgerHeadMasterComponent {
  private readonly audit = inject(AuditService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly lookups = signal<AuditLookups | null>(null);
  readonly ledgerTypes = signal<LedgerTypeOption[]>([]);
  readonly ledgerHeads = signal<LedgerHeadMaster[]>([]);
  readonly form = signal<LedgerHeadFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly importVisible = signal(false);
  readonly importLoading = signal(false);
  readonly importSourceLoading = signal(false);
  readonly importSourceItems = signal<LedgerHeadMaster[]>([]);
  readonly importSelectedIds = signal<Set<number>>(new Set());
  /** Import popup language filter: Marathi (Devanagari) vs English (Latin) names. */
  readonly importLanguage = signal<ImportLanguage>('M');
  readonly listOrgID = signal<number | null>(null);
  readonly listLedgerTypeID = signal<number | null>(null);
  readonly listStatusActive = signal(true);
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  private static readonly ImportSourceOrgID = 1;

  readonly schoolOrgs = computed(() => this.lookups()?.orgs ?? []);
  readonly canImport = computed(() => {
    const orgId = this.listOrgID();
    return orgId != null && orgId > 0 && orgId !== LedgerHeadMasterComponent.ImportSourceOrgID;
  });
  readonly importSelectedCount = computed(() => this.importSelectedIds().size);
  readonly filteredImportSourceItems = computed(() => {
    const lang = this.importLanguage();
    return this.importSourceItems().filter((item) => matchesImportLanguage(item.ledgerHead, lang));
  });
  readonly importAllSelected = computed(() => {
    const items = this.filteredImportSourceItems();
    const selected = this.importSelectedIds();
    return items.length > 0 && items.every((x) => selected.has(x.ledgerHeadID));
  });

  readonly filteredLedgerHeads = computed(() => {
    const typeId = this.listLedgerTypeID();
    let list = filterMasterListByStatus(this.ledgerHeads(), this.listStatusActive());
    if (typeId) list = list.filter((h) => h.ledgerTypeID === typeId);
    return list;
  });
  readonly listPageCount = computed(() => {
    const total = this.filteredLedgerHeads().length;
    return Math.max(1, Math.ceil(total / this.listPageSize()));
  });
  readonly paginatedLedgerHeads = computed(() => {
    const list = this.filteredLedgerHeads();
    const start = this.listPageIndex() * this.listPageSize();
    return list.slice(start, start + this.listPageSize());
  });
  readonly listPageStart = computed(() => {
    const total = this.filteredLedgerHeads().length;
    if (!total) return 0;
    return this.listPageIndex() * this.listPageSize() + 1;
  });
  readonly listPageEnd = computed(() => {
    const total = this.filteredLedgerHeads().length;
    if (!total) return 0;
    return Math.min(total, (this.listPageIndex() + 1) * this.listPageSize());
  });
  readonly selectedOrgName = computed(() => {
    const orgId = this.listOrgID();
    return this.schoolOrgs().find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.audit.getLookups(),
      ledgerTypes: this.audit.getLedgerTypes(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, ledgerTypes, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        this.ledgerTypes.set(ledgerTypes);
        if (!data?.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
          return;
        }
        if (!ledgerTypes.length) {
          this.errorMessage.set('No ledger types found.');
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
    else this.ledgerHeads.set([]);
  }

  onListLedgerTypeChange(typeId: number | null): void {
    this.listLedgerTypeID.set(typeId);
    this.listPageIndex.set(0);
    this.closeForm();
  }

  onListStatusChange(active: boolean): void {
    this.listStatusActive.set(active);
    this.listPageIndex.set(0);
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
    if (!orgId) return;
    this.audit
      .getLedgerHeadList(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.ledgerHeads.set(list);
        const total = this.listLedgerTypeID()
          ? list.filter((h) => h.ledgerTypeID === this.listLedgerTypeID()).length
          : list.length;
        const maxPage = Math.max(0, Math.ceil(total / this.listPageSize()) - 1);
        if (this.listPageIndex() > maxPage) {
          this.listPageIndex.set(maxPage);
        }
      });
  }

  newEntry(): void {
    const orgId = this.listOrgID();
    if (!orgId) {
      this.errorMessage.set('Select Org / School on the list page before adding new.');
      return;
    }
    this.closeImport();
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      ...this.emptyForm(),
      underOrgID: orgId,
      orgID: orgId,
      ledgerTypeID: this.listLedgerTypeID() ?? this.ledgerTypes()[0]?.ledgerTypeID ?? null
    });
    this.refreshNextSrNo(orgId);
  }

  editEntry(item: LedgerHeadMaster): void {
    this.closeImport();
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      ledgerHeadID: item.ledgerHeadID,
      underOrgID: item.underOrgID,
      orgID: item.orgID ?? item.underOrgID,
      srNo: item.srNo,
      ledgerHead: item.ledgerHead,
      ledgerHeadEng: item.ledgerHeadEng ?? '',
      description: item.description ?? '',
      ledgerTypeID: item.ledgerTypeID,
      isActive: item.isActive
    });
  }

  private refreshNextSrNo(orgId: number): void {
    this.audit
      .getNextLedgerHeadSrNo(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((srNo) => this.form.update((f) => ({ ...f, srNo })));
  }

  save(): void {
    const f = this.form();
    const errors = validateLedgerHeadForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.audit
      .saveLedgerHead(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.loading.set(false);
        if (!data) {
          const backendErrors = mapBackendMessageToFieldErrors(message);
          if (hasFieldErrors(backendErrors)) {
            this.fieldErrors.set(backendErrors);
          }
          const errorText = message ?? 'Unable to save ledger head.';
          this.saveError.set(errorText);
          toastOnSave(this.toast, false, { entity: 'Ledger head', mode: this.formMode(), errorMessage: errorText });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Ledger head', mode: this.formMode() });
        this.closeForm();
        this.loadList();
      });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  cancel(): void {
    this.closeForm();
    this.errorMessage.set(null);
  }

  deleteEntry(item: LedgerHeadMaster): void {
    if (!item.isActive) return;
    if (!confirm(`Delete ledger head "${item.ledgerHead}"?`)) return;
    this.loading.set(true);
    this.audit
      .saveLedgerHead({
        ledgerHeadID: item.ledgerHeadID,
        underOrgID: item.underOrgID,
        orgID: item.orgID ?? item.underOrgID,
        srNo: item.srNo,
        ledgerHead: item.ledgerHead,
        ledgerHeadEng: item.ledgerHeadEng ?? '',
        description: item.description ?? '',
        ledgerTypeID: item.ledgerTypeID,
        isActive: false
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.loading.set(false);
        if (!data) {
          this.toast.showError(message ?? 'Unable to delete ledger head.', 'Ledger Head');
          return;
        }
        this.toast.showSuccess('Ledger head deleted.', 'Ledger Head');
        this.loadList();
      });
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
    this.audit
      .getLedgerHeadList(LedgerHeadMasterComponent.ImportSourceOrgID)
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
    const visibleIds = new Set(this.filteredImportSourceItems().map((x) => x.ledgerHeadID));
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
    this.importSelectedIds.set(new Set(this.filteredImportSourceItems().map((x) => x.ledgerHeadID)));
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
      this.toast.showError('Select at least one ledger head to import.', 'Import');
      return;
    }

    this.importLoading.set(true);
    this.audit
      .importLedgerHeads(orgId, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.importLoading.set(false);
        if (!data) {
          this.toast.showError(message ?? 'Unable to import ledger heads.', 'Import failed');
          return;
        }
        this.closeImport();
        this.loadList();
        this.toast.showSuccess(
          message ?? `Imported ${data.importedCount} ledger head(s). Skipped ${data.skippedCount}.`,
          'Imported'
        );
      });
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  updateForm<K extends keyof LedgerHeadFormState>(key: K, value: LedgerHeadFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((x) => ({ ...x, [key]: value }));
  }

  private emptyForm(): LedgerHeadFormState {
    return {
      ledgerHeadID: null,
      underOrgID: null,
      orgID: null,
      srNo: 1,
      ledgerHead: '',
      ledgerHeadEng: '',
      description: '',
      ledgerTypeID: null,
      isActive: true
    };
  }
}
