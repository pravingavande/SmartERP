import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ClassFormState, ClassMasterItem } from '../../../core/models/master.model';
import { MasterService } from '../../../core/services/master.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateClassForm } from '../../../core/utils/master-validation.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-class-master',
  imports: [FormsModule],
  templateUrl: './class-master.component.html',
  styleUrl: './class-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassMasterComponent {
  private readonly master = inject(MasterService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(true);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly items = signal<ClassMasterItem[]>([]);
  readonly form = signal<ClassFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof ClassMasterItem>('className');
  readonly sortDir = signal<SortDirection>('asc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = this.items();
    if (q) rows = rows.filter((x) => x.className.toLowerCase().includes(q));
    return sortRows(rows, this.sortKey(), this.sortDir());
  });
  readonly listPageCount = computed(() => pageCount(this.filteredItems().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.filteredItems(), this.listPageIndex(), this.listPageSize()));
  readonly listPageStart = computed(() => pageRange(this.filteredItems().length, this.listPageIndex(), this.listPageSize()).start);
  readonly listPageEnd = computed(() => pageRange(this.filteredItems().length, this.listPageIndex(), this.listPageSize()).end);

  constructor() {
    this.loadList();
  }

  loadList(): void {
    this.listLoading.set(true);
    this.master.getClasses().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((list) => {
      this.listLoading.set(false);
      this.items.set(list);
      this.listPageIndex.set(0);
    });
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
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

  newItem(): void {
    this.formMode.set('new');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set(this.emptyForm());
  }

  editItem(item: ClassMasterItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({ classID: item.classID, className: item.className, isActive: item.isActive });
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
    this.formVisible.set(false);
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  updateForm<K extends keyof ClassFormState>(key: K, value: ClassFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
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
      this.formVisible.set(false);
      this.loadList();
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private emptyForm(): ClassFormState {
    return { classID: null, className: '', isActive: true };
  }
}
