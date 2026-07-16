import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventoryLookups, ItemGroupFormState, ItemGroupMasterItem } from '../../../core/models/master.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MasterService } from '../../../core/services/master.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateItemGroupForm } from '../../../core/utils/master-validation.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-item-group-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent, OrgSchoolSelectComponent],
  templateUrl: './item-group-master.component.html',
  styleUrl: './item-group-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemGroupMasterComponent {
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
  readonly items = signal<ItemGroupMasterItem[]>([]);
  readonly form = signal<ItemGroupFormState>(this.emptyForm());
  readonly formSrNo = signal<number | null>(null);
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly listOrgID = signal<number | null>(null);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof ItemGroupMasterItem>('itemGroupName');
  readonly sortDir = signal<SortDirection>('asc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = this.items();
    if (q) rows = rows.filter((x) => x.itemGroupName.toLowerCase().includes(q));
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
    if (orgId) this.loadList();
    else this.items.set([]);
  }

  loadList(): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.listLoading.set(true);
    this.master
      .getItemGroups(orgId)
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

  toggleSort(key: keyof ItemGroupMasterItem): void {
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
    this.formSrNo.set(null);
    this.form.set({ ...this.emptyForm(), orgID: orgId });
  }

  editItem(item: ItemGroupMasterItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.formSrNo.set(item.srNo);
    this.form.set({
      itemGroupID: item.itemGroupID,
      orgID: item.orgID,
      itemGroupName: item.itemGroupName,
      isActive: item.isActive
    });
  }

  deleteItem(item: ItemGroupMasterItem): void {
    if (!confirm(`Deactivate item group "${item.itemGroupName}"?`)) return;
    this.master.deleteItemGroup(item.itemGroupID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to delete item group.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Item group deactivated.', 'Deleted');
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

  onFormOrgChange(orgId: number | null): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'orgID'));
    this.form.update((f) => ({ ...f, orgID: orgId }));
    this.listOrgID.set(orgId);
  }

  updateForm<K extends keyof ItemGroupFormState>(key: K, value: ItemGroupFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save(): void {
    const f = this.form();
    const errors = validateItemGroupForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }
    this.loading.set(true);
    this.master.saveItemGroup(f).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.fieldErrors.set(mapBackendMessageToFieldErrors(message));
        this.saveError.set(message ?? 'Unable to save item group.');
        toastOnSave(this.toast, false, { entity: 'Item group', mode: this.formMode(), errorMessage: message ?? 'Unable to save item group.' });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Item group', mode: this.formMode() });
      this.closeForm();
      this.loadList();
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private emptyForm(): ItemGroupFormState {
    return { itemGroupID: null, orgID: null, itemGroupName: '', isActive: true };
  }
}
