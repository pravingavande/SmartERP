import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditLookups, OrgOption } from '../../../core/models/audit.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { DRHeadFormState, DRHeadMaster, DRHeadOption } from '../../../core/models/donation.model';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DonationService } from '../../../core/services/donation.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateDRHeadForm } from '../../../core/utils/master-validation.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-donation-head-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent],
  templateUrl: './donation-head-master.component.html',
  styleUrl: './donation-head-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonationHeadMasterComponent {
  private readonly donation = inject(DonationService);
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
  readonly items = signal<DRHeadMaster[]>([]);
  readonly form = signal<DRHeadFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly importVisible = signal(false);
  readonly importLoading = signal(false);
  readonly importSourceLoading = signal(false);
  readonly importSourceItems = signal<DRHeadOption[]>([]);
  readonly importSelectedIds = signal<Set<number>>(new Set());
  readonly listOrgID = signal<number | null>(null);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof DRHeadMaster>('srNo');
  readonly sortDir = signal<SortDirection>('asc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  private static readonly ImportSourceUnderOrgID = 1;

  /** Sanstha-only options for this form (not school orgs / shared school select). */
  readonly sansthaOrgs = computed(() => this.lookups()?.sansthaOrgs ?? []);
  readonly selectedOrgName = computed(() => {
    const orgId = this.listOrgID();
    return this.sansthaOrgs().find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });
  readonly canImport = computed(() => {
    const orgId = this.listOrgID();
    return orgId != null && orgId > 0 && orgId !== DonationHeadMasterComponent.ImportSourceUnderOrgID;
  });
  readonly importSelectedCount = computed(() => this.importSelectedIds().size);
  readonly importAllSelected = computed(() => {
    const items = this.importSourceItems();
    const selected = this.importSelectedIds();
    return items.length > 0 && items.every((x) => selected.has(x.drHeadID));
  });

  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = this.items();
    if (q) rows = rows.filter((x) => x.drHeadName.toLowerCase().includes(q));
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
        const sansthaOrgs = this.resolveSansthaOrgs(data?.sansthaOrgs ?? []);
        this.lookups.set(data ? { ...data, sansthaOrgs } : null);
        if (!sansthaOrgs.length) {
          this.errorMessage.set('No Sanstha found for your login.');
          return;
        }
        const orgId = this.resolveDefaultSansthaOrgId(sansthaOrgs, profile);
        this.listOrgID.set(orgId);
        if (orgId) this.loadList();
      });
  }

  private resolveSansthaOrgs(fromApi: OrgOption[]): OrgOption[] {
    if (fromApi.length) return fromApi;

    const session = this.auth.currentUser();
    const orgs: OrgOption[] = [];

    for (const ctx of session?.schoolContexts ?? []) {
      if (!ctx.sansthaId || !ctx.sansthaName) continue;
      if (!orgs.some((o) => o.orgID === ctx.sansthaId)) {
        orgs.push({
          orgID: ctx.sansthaId,
          organizationName: ctx.sansthaName,
          schoolCode: ctx.sansthaId
        });
      }
    }

    if (!orgs.length && session?.sansthaId && session.sansthaName) {
      orgs.push({
        orgID: session.sansthaId,
        organizationName: session.sansthaName,
        schoolCode: session.sansthaId
      });
    }

    return orgs;
  }

  private resolveDefaultSansthaOrgId(orgs: OrgOption[], profile: UserProfile | null): number | null {
    const session = this.auth.currentUser();
    if (session?.sansthaId) {
      const match = orgs.find((o) => o.orgID === session.sansthaId);
      if (match) return match.orgID;
    }
    if (profile?.orgId) {
      const match = orgs.find((o) => o.orgID === profile.orgId);
      if (match) return match.orgID;
    }
    return orgs[0]?.orgID ?? null;
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
    this.donation
      .getDRHeadList(orgId)
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

  toggleSort(key: keyof DRHeadMaster): void {
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

  editItem(item: DRHeadMaster): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      drHeadID: item.drHeadID,
      underOrgID: item.underOrgID,
      srNo: item.srNo,
      drHeadName: item.drHeadName,
      isActive: item.isActive
    });
  }

  deleteItem(item: DRHeadMaster): void {
    if (!confirm(`Deactivate donation head "${item.drHeadName}"?`)) return;
    this.donation.deleteDRHead(item.drHeadID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to delete donation head.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Donation head deactivated.', 'Deleted');
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
    this.importSelectedIds.set(new Set());
    this.importSourceLoading.set(true);
    this.donation
      .getDRHeadMaster(DonationHeadMasterComponent.ImportSourceUnderOrgID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.importSourceLoading.set(false);
        this.importSourceItems.set(list);
      });
  }

  closeImport(): void {
    this.importVisible.set(false);
    this.importLoading.set(false);
    this.importSourceLoading.set(false);
    this.importSourceItems.set([]);
    this.importSelectedIds.set(new Set());
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
    this.importSelectedIds.set(new Set(this.importSourceItems().map((x) => x.drHeadID)));
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
      this.toast.showError('Select at least one donation head to import.', 'Import');
      return;
    }

    this.importLoading.set(true);
    this.donation
      .importDRHeads(orgId, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.importLoading.set(false);
        if (!data) {
          this.toast.showError(message ?? 'Unable to import donation heads.', 'Import failed');
          return;
        }
        this.closeImport();
        this.loadList();
        this.toast.showSuccess(
          message ?? `Imported ${data.importedCount} donation head(s). Skipped ${data.skippedCount}.`,
          'Imported'
        );
      });
  }

  updateForm<K extends keyof DRHeadFormState>(key: K, value: DRHeadFormState[K]): void {
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
    const errors = validateDRHeadForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }
    this.loading.set(true);
    this.donation.saveDRHead(f).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.fieldErrors.set(mapBackendMessageToFieldErrors(message));
        this.saveError.set(message ?? 'Unable to save donation head.');
        toastOnSave(this.toast, false, {
          entity: 'Donation head',
          mode: this.formMode(),
          errorMessage: message ?? 'Unable to save donation head.'
        });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Donation head', mode: this.formMode() });
      this.closeForm();
      this.loadList();
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private loadNextSrNo(underOrgId: number): void {
    this.donation.getNextDRHeadSrNo(underOrgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((srNo) => {
      this.form.update((f) => ({ ...f, srNo }));
    });
  }

  private emptyForm(): DRHeadFormState {
    return { drHeadID: null, underOrgID: null, srNo: null, drHeadName: '', isActive: true };
  }
}
