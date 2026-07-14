import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventoryLookups, ItemMasterItem, StockFormState, StockRegisterItem } from '../../../core/models/master.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MasterService } from '../../../core/services/master.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { coerceEnglishNumber } from '../../../core/utils/marathi-numerals';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateStockForm } from '../../../core/utils/master-validation.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-stock-register',
  imports: [FormsModule, CurrencyPipe, MarathiNumberInputDirective, MasterListPaginationComponent],
  templateUrl: './stock-register.component.html',
  styleUrl: './stock-register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockRegisterComponent {
  private readonly master = inject(MasterService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly itemsLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<InventoryLookups | null>(null);
  readonly itemOptions = signal<ItemMasterItem[]>([]);
  readonly items = signal<StockRegisterItem[]>([]);
  readonly form = signal<StockFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly listOrgID = signal<number | null>(null);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof StockRegisterItem>('stockID');
  readonly sortDir = signal<SortDirection>('desc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly activeItemOptions = computed(() => this.itemOptions().filter((i) => i.isActive));

  readonly computedAmount = computed(() => {
    const qty = Number(this.form().qty) || 0;
    const rate = Number(this.form().rate) || 0;
    return qty * rate;
  });

  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = this.items();
    if (q) {
      rows = rows.filter(
        (x) =>
          (x.itemName ?? '').toLowerCase().includes(q) ||
          (x.remark ?? '').toLowerCase().includes(q)
      );
    }
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
        const orgId = this.resolveDefaultOrgId(data, profile);
        this.listOrgID.set(orgId);
        if (orgId) this.onListOrgChange(orgId);
      });
  }

  private resolveDefaultOrgId(data: InventoryLookups, profile: UserProfile | null): number | null {
    if (profile?.schoolCode) {
      const match = data.orgs.find((o) => o.schoolCode === profile.schoolCode);
      if (match) return match.orgID;
    }
    if (profile?.orgId) {
      const match = data.orgs.find((o) => o.orgID === profile.orgId);
      if (match) return match.orgID;
    }
    return data.orgs.length === 1 ? data.orgs[0].orgID : data.orgs[0]?.orgID ?? null;
  }

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listPageIndex.set(0);
    this.closeForm();
    if (!orgId) {
      this.items.set([]);
      this.itemOptions.set([]);
      return;
    }
    this.loadItemOptions(orgId);
    this.loadList();
  }

  loadItemOptions(orgId: number): void {
    this.itemsLoading.set(true);
    this.master
      .getItems(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.itemsLoading.set(false);
        this.itemOptions.set(list);
      });
  }

  loadList(): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.listLoading.set(true);
    this.master
      .getStockList(orgId)
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

  toggleSort(key: keyof StockRegisterItem): void {
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

  newEntry(): void {
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
  }

  editEntry(item: StockRegisterItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      stockID: item.stockID,
      orgID: item.orgID,
      itemID: item.itemID,
      qty: item.qty,
      rate: item.rate,
      amount: item.amount,
      remark: item.remark ?? ''
    });
  }

  deleteEntry(item: StockRegisterItem): void {
    const label = item.itemName ?? 'this entry';
    if (!confirm(`Delete stock entry for "${label}"?`)) return;
    this.master.deleteStock(item.stockID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to delete stock entry.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Stock entry deleted.', 'Deleted');
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

  onItemChange(itemId: number | null): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'itemID'));
    const selected = this.activeItemOptions().find((i) => i.itemID === itemId) ?? null;
    this.form.update((f) => ({
      ...f,
      itemID: itemId,
      rate: selected?.rate ?? f.rate,
      amount: null
    }));
  }

  updateForm<K extends keyof StockFormState>(key: K, value: StockFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value, amount: null }));
  }

  save(): void {
    this.form.update((f) => ({
      ...f,
      qty: coerceEnglishNumber(f.qty) ?? 0,
      rate: coerceEnglishNumber(f.rate) ?? 0
    }));
    const f = this.form();
    const errors = validateStockForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }
    this.loading.set(true);
    this.master.saveStock(f).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.fieldErrors.set(mapBackendMessageToFieldErrors(message));
        this.saveError.set(message ?? 'Unable to save stock entry.');
        toastOnSave(this.toast, false, { entity: 'Stock entry', mode: this.formMode(), errorMessage: message ?? 'Unable to save stock entry.' });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Stock entry', mode: this.formMode() });
      this.closeForm();
      this.loadList();
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private emptyForm(): StockFormState {
    return { stockID: null, orgID: null, itemID: null, qty: null, rate: null, amount: null, remark: '' };
  }
}
