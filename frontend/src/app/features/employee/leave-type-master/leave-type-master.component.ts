import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LeaveTypeFormState, LeaveTypeItem } from '../../../core/models/leave.model';
import { LeaveService } from '../../../core/services/leave.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateLeaveTypeForm } from '../../../core/utils/master-validation.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-leave-type-master',
  imports: [FormsModule, MasterListPaginationComponent],
  templateUrl: './leave-type-master.component.html',
  styleUrl: './leave-type-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveTypeMasterComponent {
  private readonly leaveService = inject(LeaveService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(true);
  readonly saveError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly items = signal<LeaveTypeItem[]>([]);
  readonly form = signal<LeaveTypeFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly listPageCount = computed(() => pageCount(this.items().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.items(), this.listPageIndex(), this.listPageSize()));

  constructor() {
    this.loadList();
  }

  loadList(): void {
    this.listLoading.set(true);
    this.errorMessage.set(null);
    this.leaveService
      .getLeaveTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.listLoading.set(false);
        this.items.set(list);
        this.listPageIndex.set(0);
      });
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
    this.formMode.set('new');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set(this.emptyForm());
  }

  editItem(item: LeaveTypeItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      leaveTypeID: item.leaveTypeID,
      leaveTypeName: item.leaveTypeName,
      isActive: item.isActive
    });
  }

  cancel(): void {
    this.formVisible.set(false);
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  updateForm<K extends keyof LeaveTypeFormState>(key: K, value: LeaveTypeFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save(): void {
    const f = this.form();
    const errors = validateLeaveTypeForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.saveError.set(null);
    this.leaveService
      .saveLeaveType({ ...f, leaveTypeName: f.leaveTypeName.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.loading.set(false);
        if (!data) {
          const backendErrors = mapBackendMessageToFieldErrors(message);
          if (hasFieldErrors(backendErrors)) {
            this.fieldErrors.set(backendErrors);
          }
          this.saveError.set(message ?? 'Unable to save leave type.');
          toastOnSave(this.toast, false, { entity: 'Leave type', mode: this.formMode(), errorMessage: message ?? 'Unable to save leave type.' });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Leave type', mode: this.formMode() });
        this.formVisible.set(false);
        this.loadList();
      });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private emptyForm(): LeaveTypeFormState {
    return { leaveTypeID: null, leaveTypeName: '', isActive: true };
  }
}
