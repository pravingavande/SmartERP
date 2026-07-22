import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import {
  AcademicScheduleFilter,
  AcademicScheduleFormState,
  AcademicScheduleItem,
  AcademicScheduleLookups,
  MasterOption,
  MONTH_OPTIONS,
  monthLabel
} from '../../../core/models/master.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MasterService } from '../../../core/services/master.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateAcademicScheduleForm } from '../../../core/utils/master-validation.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { resolveDefaultSchoolOrgId, resolveSansthaIdFromSchool } from '../../../core/utils/org-access.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit' | 'view';

const ALLOWED_FILE_EXT = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);

@Component({
  selector: 'app-academic-schedule',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent, OrgSchoolSelectComponent],
  templateUrl: './academic-schedule.component.html',
  styleUrl: './academic-schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcademicScheduleComponent {
  private readonly master = inject(MasterService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly monthOptions = MONTH_OPTIONS;
  readonly monthLabel = monthLabel;

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly fileUploading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<AcademicScheduleLookups | null>(null);
  readonly classes = signal<MasterOption[]>([]);
  readonly subjects = signal<MasterOption[]>([]);
  readonly items = signal<AcademicScheduleItem[]>([]);
  readonly form = signal<AcademicScheduleFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly userProfile = signal<UserProfile | null>(null);

  /** Same as Teacher Master — selected school for list filter. */
  readonly listOrgID = signal<number | null>(null);
  readonly listClassId = signal<number | null>(null);
  readonly listSubjectId = signal<number | null>(null);
  readonly listTMonth = signal<number | null>(null);
  readonly listWeekId = signal<number | null>(null);
  readonly listFromDate = signal('');
  readonly listToDate = signal('');
  readonly listAyId = signal<number | null>(null);

  readonly sortKey = signal<keyof AcademicScheduleItem>('srNo');
  readonly sortDir = signal<SortDirection>('desc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  /** Same as Teacher Master — orgs already filtered in MasterService via auth.filterSchoolOrgs. */
  readonly schoolOrgs = computed(() => this.lookups()?.orgs ?? []);
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
    this.errorMessage.set(null);
    forkJoin({
      lookups: this.master.getAcademicScheduleLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.userProfile.set(profile);
        this.lookups.set(data);
        if (!data) {
          this.errorMessage.set('Unable to load academic schedule masters. Please refresh or contact admin.');
          this.items.set([]);
          return;
        }
        if (!data.orgs?.length) {
          this.errorMessage.set('No schools found for your login. Contact admin to map org access.');
          this.items.set([]);
          return;
        }
        // Same default selection as Teacher Master
        this.listOrgID.set(resolveDefaultSchoolOrgId(data.orgs, profile));
        if (data.ayList?.length) {
          this.listAyId.set(data.ayList[0].ayID);
        }
        this.loadScopedMasters(this.listOrgID());
        this.loadList();
      });
  }

  loadList(): void {
    const orgId = this.listOrgID();
    // Same as Teacher Master — only load for selected school
    if (!orgId) {
      this.listLoading.set(false);
      this.items.set([]);
      this.listPageIndex.set(0);
      return;
    }
    this.listLoading.set(true);
    const filter: AcademicScheduleFilter = {
      underOrgId: orgId,
      classId: this.listClassId(),
      subjectId: this.listSubjectId(),
      tMonth: this.listTMonth(),
      weekId: this.listWeekId(),
      fromDate: this.listFromDate() || null,
      toDate: this.listToDate() || null,
      ayId: this.listAyId(),
      search: null
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

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listClassId.set(null);
    this.listSubjectId.set(null);
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadScopedMasters(orgId);
    this.loadList();
  }

  onFilterChange(): void {
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
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
    const orgId =
      this.listOrgID() ?? resolveDefaultSchoolOrgId(this.schoolOrgs(), this.userProfile());
    if (!orgId) {
      this.errorMessage.set('Select a school on the list page before adding a new schedule.');
      return;
    }
    this.errorMessage.set(null);
    this.formMode.set('new');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    const base = this.emptyForm();
    base.underOrgID = orgId;
    this.form.set(base);
    this.loadScopedMasters(orgId);
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
    this.closeForm();
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  updateForm<K extends keyof AcademicScheduleFormState>(key: K, value: AcademicScheduleFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  onFormOrgChange(orgId: number | null): void {
    this.form.update((f) => ({
      ...f,
      underOrgID: orgId,
      classID: null,
      subjectID: null
    }));
    this.loadScopedMasters(orgId);
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

    const orgId = this.form().underOrgID ?? this.listOrgID();
    if (!orgId) {
      this.toast.showError('Please select School / Organization before uploading a file.', 'Upload failed');
      return;
    }
    this.fileUploading.set(true);
    this.master
      .uploadAcademicScheduleFile(file, orgId)
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
        this.closeForm();
        this.loadList();
      });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  formTitle(): string {
    const mode = this.formMode();
    if (mode === 'view') return 'View Academic Scheduler';
    if (mode === 'edit') return 'Edit Academic Scheduler';
    return 'New Academic Scheduler';
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
        if (data.underOrgID) this.loadScopedMasters(data.underOrgID);
      });
  }

  private loadScopedMasters(schoolOrgId: number | null): void {
    if (!schoolOrgId) {
      this.classes.set([]);
      this.subjects.set([]);
      return;
    }

    const sansthaId = resolveSansthaIdFromSchool(schoolOrgId, this.schoolOrgs(), this.auth.currentUser());

    forkJoin({
      classes: this.master.getClasses(schoolOrgId),
      subjects: sansthaId ? this.master.getSubjects(sansthaId) : of([])
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ classes, subjects }) => {
        this.classes.set(
          classes
            .filter((c) => c.isActive !== false)
            .map((c) => ({ id: c.classID, name: c.className }))
        );
        this.subjects.set(
          subjects
            .filter((s) => s.isActive !== false)
            .map((s) => ({ id: s.subjectID, name: s.subjectName }))
        );
      });
  }

  private emptyForm(): AcademicScheduleFormState {
    return {
      asid: null,
      underOrgID: null,
      tMonth: null,
      classID: null,
      subjectID: null,
      srNo: null,
      title: '',
      description: '',
      weekID: null,
      fileAttachment: '',
      ayID: null
    };
  }
}
