import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AcademicScheduleFilter,
  AcademicScheduleFormState,
  AcademicScheduleItem,
  AcademicScheduleLookups,
  MONTH_OPTIONS,
  monthLabel
} from '../../../core/models/master.model';
import { MasterService } from '../../../core/services/master.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateAcademicScheduleForm } from '../../../core/utils/master-validation.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit' | 'view';

const ALLOWED_FILE_EXT = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);

@Component({
  selector: 'app-academic-schedule',
  imports: [FormsModule, DatePipe, MasterListPaginationComponent],
  templateUrl: './academic-schedule.component.html',
  styleUrl: './academic-schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcademicScheduleComponent {
  private readonly master = inject(MasterService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly monthOptions = MONTH_OPTIONS;
  readonly monthLabel = monthLabel;

  readonly loading = signal(false);
  readonly listLoading = signal(true);
  readonly lookupsLoading = signal(true);
  readonly fileUploading = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<AcademicScheduleLookups | null>(null);
  readonly items = signal<AcademicScheduleItem[]>([]);
  readonly form = signal<AcademicScheduleFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);

  readonly listUnderOrgId = signal<number | null>(null);
  readonly listClassId = signal<number | null>(null);
  readonly listSubjectId = signal<number | null>(null);
  readonly listTMonth = signal<number | null>(null);
  readonly listWeekId = signal<number | null>(null);
  readonly listFromDate = signal('');
  readonly listToDate = signal('');
  readonly listAyId = signal<number | null>(null);
  readonly searchText = signal('');

  readonly sortKey = signal<keyof AcademicScheduleItem>('tDate');
  readonly sortDir = signal<SortDirection>('desc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly sortedItems = computed(() => sortRows(this.items(), this.sortKey(), this.sortDir()));
  readonly listPageCount = computed(() => pageCount(this.sortedItems().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.sortedItems(), this.listPageIndex(), this.listPageSize()));
  readonly listPageStart = computed(() => pageRange(this.sortedItems().length, this.listPageIndex(), this.listPageSize()).start);
  readonly listPageEnd = computed(() => pageRange(this.sortedItems().length, this.listPageIndex(), this.listPageSize()).end);

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.master
      .getAcademicScheduleLookups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (data?.sansthaOrgs?.length) {
          this.listUnderOrgId.set(data.sansthaOrgs[0].orgID);
        }
        if (data?.ayList?.length) {
          this.listAyId.set(data.ayList[0].ayID);
        }
        this.loadList();
      });
  }

  loadList(): void {
    this.listLoading.set(true);
    const filter: AcademicScheduleFilter = {
      underOrgId: this.listUnderOrgId(),
      classId: this.listClassId(),
      subjectId: this.listSubjectId(),
      tMonth: this.listTMonth(),
      weekId: this.listWeekId(),
      fromDate: this.listFromDate() || null,
      toDate: this.listToDate() || null,
      ayId: this.listAyId(),
      search: this.searchText() || null
    };
    this.master
      .getAcademicSchedules(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.listLoading.set(false);
        this.items.set(list);
        this.listPageIndex.set(0);
      });
  }

  onFilterChange(): void {
    this.listPageIndex.set(0);
    this.loadList();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.onFilterChange();
  }

  toggleSort(key: keyof AcademicScheduleItem): void {
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
    this.formMode.set('new');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    const base = this.emptyForm();
    base.underOrgID = this.listUnderOrgId();
    this.form.set(base);
    this.master
      .getCurrentAyId()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ayId) => {
        if (ayId) this.form.update((f) => ({ ...f, ayID: ayId }));
      });
  }

  editItem(item: AcademicScheduleItem): void {
    this.loadSchedule(item.asid, 'edit');
  }

  viewItem(item: AcademicScheduleItem): void {
    this.loadSchedule(item.asid, 'view');
  }

  deleteItem(item: AcademicScheduleItem): void {
    if (!confirm(`Delete schedule "${item.title}"?`)) return;
    this.master
      .deleteAcademicSchedule(item.asid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => {
        if (!r.success) {
          this.toast.showError(r.message ?? 'Unable to delete schedule.', 'Delete failed');
          return;
        }
        this.toast.showSuccess('Academic schedule deleted.', 'Deleted');
        this.loadList();
      });
  }

  cancel(): void {
    this.formVisible.set(false);
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  updateForm<K extends keyof AcademicScheduleFormState>(key: K, value: AcademicScheduleFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  onFileSelected(event: Event): void {
    if (this.isViewMode()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_FILE_EXT.has(ext)) {
      this.toast.showError('Allowed file types: PDF, DOC, DOCX, JPG, JPEG, PNG.', 'Invalid file');
      return;
    }

    this.fileUploading.set(true);
    this.master
      .uploadAcademicScheduleFile(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ fileName, message }) => {
        this.fileUploading.set(false);
        if (!fileName) {
          this.toast.showError(message ?? 'Unable to upload file.', 'Upload failed');
          return;
        }
        this.updateForm('fileAttachment', fileName);
        this.toast.showSuccess('File uploaded.', 'Uploaded');
      });
  }

  openAttachment(fileName: string): void {
    if (!fileName?.trim()) return;
    const url = this.master.academicScheduleFileUrl(fileName);
    this.master
      .downloadFile(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          window.open(objectUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: () => this.toast.showError('Unable to open file.', 'Download failed')
      });
  }

  clearAttachment(): void {
    if (this.isViewMode()) return;
    this.updateForm('fileAttachment', '');
  }

  save(): void {
    if (this.isViewMode()) return;
    const f = this.form();
    const errors = validateAcademicScheduleForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }

    this.loading.set(true);
    this.master
      .saveAcademicSchedule(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.loading.set(false);
        if (!data) {
          this.fieldErrors.set(mapBackendMessageToFieldErrors(message));
          this.saveError.set(message ?? 'Unable to save academic schedule.');
          toastOnSave(this.toast, false, {
            entity: 'Academic schedule',
            mode: this.formMode(),
            errorMessage: message ?? 'Unable to save academic schedule.'
          });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Academic schedule', mode: this.formMode() });
        this.formVisible.set(false);
        this.loadList();
      });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  formTitle(): string {
    const mode = this.formMode();
    if (mode === 'view') return 'View Academic Schedule';
    if (mode === 'edit') return 'Edit Academic Schedule';
    return 'New Academic Schedule';
  }

  private loadSchedule(asid: number, mode: FormMode): void {
    this.loading.set(true);
    this.master
      .getAcademicScheduleById(asid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.loading.set(false);
        if (!data) {
          this.toast.showError('Unable to load academic schedule.', 'Load failed');
          return;
        }
        this.formMode.set(mode);
        this.formVisible.set(true);
        this.fieldErrors.set({});
        this.saveError.set(null);
        this.form.set(data);
      });
  }

  private emptyForm(): AcademicScheduleFormState {
    return {
      asid: null,
      underOrgID: null,
      tMonth: null,
      classID: null,
      subjectID: null,
      tDate: '',
      title: '',
      description: '',
      weekID: null,
      fileAttachment: '',
      ayID: null
    };
  }
}
