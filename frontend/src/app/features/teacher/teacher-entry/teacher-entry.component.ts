import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subject, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  TeacherDocumentLine,
  TeacherFormState,
  TeacherListFilter,
  TeacherListItem,
  TeacherLookupsBundle,
  TeacherSchoolLine,
  TEACHER_STAFF_TYPE_ID
} from '../../../core/models/teacher.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { LanguageService } from '../../../core/services/language.service';
import { TeacherService } from '../../../core/services/teacher.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors } from '../../../core/utils/form-field-errors';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { todayIsoDate } from '../../../core/utils/date.util';
import { resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { buildEmployeeName } from '../../../core/utils/employee-name.util';
import {
  serializeTeacherDocuments,
  DUPLICATE_DOCUMENT_NAME_MESSAGE
} from '../../../core/utils/document-unsaved.util';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import {
  computeRetireDateIso,
  computeSelectionGradeDateIso,
  computeSeniorGradeDateIso
} from '../../../core/utils/teacher-service-dates.util';
import {
  mapTeacherBackendMessageToFieldErrors,
  validateTeacherForm,
  validateTeacherPhoto,
  getTeacherDocumentsSaveError
} from '../../../core/utils/teacher-validation.util';

type FormMode = 'new' | 'edit' | 'view';
type FormSection = 'basic' | 'schools' | 'documents';

interface FormStep {
  id: FormSection;
  step: number;
  label: string;
}

const FORM_STEPS: FormStep[] = [
  { id: 'basic', step: 1, label: 'Basic Details' },
  { id: 'schools', step: 2, label: 'School History' },
  { id: 'documents', step: 3, label: 'Documents' }
];

const SECTION_ORDER: FormSection[] = ['basic', 'schools', 'documents'];

@Component({
  selector: 'app-teacher-entry',
  imports: [FormsModule, MarathiNumberInputDirective, ListActionBtnComponent, OrgSchoolSelectComponent],
  templateUrl: './teacher-entry.component.html',
  styleUrl: './teacher-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherEntryComponent {
  private readonly teacherService = inject(TeacherService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Label from LanguageKeyValueMaster (M/E per Settings). */
  readonly lbl = (key: string, fallback?: string) => this.languageService.label(key, fallback);
  private readonly listReload$ = new Subject<void>();
  private readonly searchChanges$ = new Subject<string>();
  private searchDebounceSubscribed = false;

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly photoUploading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<TeacherLookupsBundle | null>(null);
  readonly teachers = signal<TeacherListItem[]>([]);
  readonly form = signal<TeacherFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly activeSection = signal<FormSection>('basic');
  readonly wizardActive = signal(false);
  readonly highestUnlockedStep = signal(1);
  readonly formSteps = FORM_STEPS;
  readonly listFilter = signal<TeacherListFilter>({ isActive: true });
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);
  readonly showAppPassword = signal(false);
  readonly userProfile = signal<UserProfile | null>(null);

  readonly masterLookups = computed(() => this.lookups()?.lookups);
  readonly paginatedTeachers = computed(() => {
    const list = this.teachers();
    const start = this.listPageIndex() * this.listPageSize();
    return list.slice(start, start + this.listPageSize());
  });
  readonly listPageCount = computed(() => Math.max(1, Math.ceil(this.teachers().length / this.listPageSize())));
  readonly listPageStart = computed(() => {
    const total = this.teachers().length;
    if (!total) return 0;
    return this.listPageIndex() * this.listPageSize() + 1;
  });
  readonly listPageEnd = computed(() => {
    const total = this.teachers().length;
    if (!total) return 0;
    return Math.min(total, (this.listPageIndex() + 1) * this.listPageSize());
  });
  readonly schoolOrgs = computed(() => this.lookups()?.orgs ?? []);
  /** Form/list User Role options — SuperAdmin hidden. */
  readonly selectableUserRoles = computed(() =>
    (this.masterLookups()?.userRoles ?? []).filter(
      (ur) => (ur.userRoleName ?? '').trim().toLowerCase() !== 'superadmin'
    )
  );
  /** Add/Edit form — Employee login (role 3) may assign only Employee role (id 4). */
  readonly formUserRoles = computed(() => {
    const roles = this.selectableUserRoles();
    if (this.auth.currentUser()?.userRoleId === 3) {
      return roles.filter((ur) => ur.userRoleID === 4);
    }
    return roles;
  });
  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isWizardFlow = computed(() => this.wizardActive() && !this.isViewMode());
  readonly isLastWizardStep = computed(() => this.activeSection() === 'documents');
  readonly documentsSectionEnabled = computed(() => !!this.form().userID);
  readonly displayName = computed(() => {
    const f = this.form();
    return f.employeeName?.trim()
      || buildEmployeeName(f.firstname, f.middleName, f.lastName)
      || 'Teacher';
  });

  private docSeq = 0;
  private schoolSeq = 0;
  private savedDocumentsJson = '';

  constructor() {
    this.listReload$
      .pipe(
        switchMap(() => {
          this.listLoading.set(true);
          return this.teacherService.getList(this.listFilter());
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.listLoading.set(false);
        this.teachers.set(list);
        const maxPage = Math.max(0, Math.ceil(list.length / this.listPageSize()) - 1);
        if (this.listPageIndex() > maxPage) this.listPageIndex.set(maxPage);
      });

    this.destroyRef.onDestroy(() => {
      this.listReload$.complete();
      this.searchChanges$.complete();
    });
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.errorMessage.set(null);
    this.ensureSearchDebounce();
    const underOrgID = this.auth.currentUser()?.sansthaId ?? 0;
    forkJoin({
      lookups: this.teacherService.getLookups(underOrgID > 0 ? underOrgID : null),
      profile: this.dashboardService.getProfile(),
      language: this.languageService.load(underOrgID)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lookups: data, profile }) => {
          this.lookupsLoading.set(false);
          this.userProfile.set(profile);
          if (!data) {
            this.errorMessage.set('Unable to load teacher masters. Please refresh or contact admin.');
            this.teachers.set([]);
            return;
          }
          this.lookups.set(data);
          if (!data.orgs?.length) {
            this.errorMessage.set('No schools found for your login. Contact admin to map org access.');
            this.teachers.set([]);
            return;
          }

          const orgId = resolveDefaultSchoolOrgId(data.orgs, profile);
          this.listFilter.update((f) => ({ ...f, orgId }));
          this.ensureDocumentLookups(data, orgId, underOrgID);
          this.loadList();
        },
        error: () => {
          this.lookupsLoading.set(false);
          this.errorMessage.set('Unable to load teacher masters. Please refresh or contact admin.');
          this.teachers.set([]);
        }
      });
  }

  /** Reload employee document options when session sansthaId is missing but school maps to a parent sanstha. */
  private ensureDocumentLookups(bundle: TeacherLookupsBundle, orgId: number | null, sessionSansthaId: number): void {
    if ((bundle.lookups?.documents?.length ?? 0) > 0) return;
    const school = bundle.orgs.find((o) => o.orgID === orgId);
    const fallbackUnder = school?.underOrgID;
    if (!fallbackUnder || fallbackUnder <= 0 || fallbackUnder === sessionSansthaId) return;
    this.reloadDocumentLookups(fallbackUnder);
  }

  /** Load document name options scoped to the school's parent sanstha. */
  private reloadDocumentLookups(underOrgId: number): void {
    if (!underOrgId || underOrgId <= 0) return;
    this.teacherService
      .getLookups(underOrgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reloaded) => {
        if (!reloaded?.lookups?.documents?.length) return;
        this.lookups.update((current) =>
          current
            ? { ...current, lookups: { ...current.lookups, documents: reloaded.lookups.documents } }
            : current
        );
      });
  }

  private resolveDocumentUnderOrgId(orgId: number | null | undefined): number | null {
    if (!orgId) return null;
    const school = this.lookups()?.orgs?.find((o) => o.orgID === orgId);
    const under = school?.underOrgID;
    return under && under > 0 ? under : orgId;
  }

  private ensureSearchDebounce(): void {
    if (this.searchDebounceSubscribed) return;
    this.searchDebounceSubscribed = true;
    this.searchChanges$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadList());
  }

  updateListFilter<K extends keyof TeacherListFilter>(key: K, value: TeacherListFilter[K]): void {
    this.listFilter.update((f) => ({ ...f, [key]: value }));
    this.listPageIndex.set(0);
    if (!this.tryCloseForm()) return;
    this.loadList();
  }

  onSearchChange(value: string): void {
    this.listFilter.update((f) => ({ ...f, search: value }));
    this.listPageIndex.set(0);
    this.searchChanges$.next(value);
  }

  loadList(): void {
    this.listReload$.next();
  }

  newTeacher(): void {
    if (this.formVisible()) this.closeForm();
    const orgs = this.lookups()?.orgs ?? [];
    const orgId =
      this.listFilter().orgId ?? resolveDefaultSchoolOrgId(orgs, this.userProfile());
    if (!orgId) {
      this.errorMessage.set('Select a school on the list page before adding a new teacher.');
      return;
    }

    this.errorMessage.set(null);
    this.formMode.set('new');
    this.formVisible.set(true);
    this.activeSection.set('basic');
    this.wizardActive.set(true);
    this.highestUnlockedStep.set(1);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.showAppPassword.set(false);
    const empty = this.emptyForm();
    if (this.auth.currentUser()?.userRoleId === 3) {
      empty.userRoleID = 4;
    }
    this.form.set(empty);
    if (orgId) this.onOrgChange(orgId);
    this.applyGradeDatesFromWorkingStart();
    this.applyRetireDateFromDobAndLeaveYear();
    this.captureDocumentsSnapshot(this.form().documents);
  }

  editTeacher(item: TeacherListItem): void {
    this.openTeacher(item.userID, 'edit');
  }

  viewTeacher(item: TeacherListItem): void {
    this.openTeacher(item.userID, 'view');
  }

  private openTeacher(userId: number, mode: FormMode): void {
    if (this.formVisible()) this.closeForm();
    this.loading.set(true);
    this.teacherService
      .getById(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.loading.set(false);
        if (!data) {
          this.errorMessage.set('Unable to load teacher.');
          return;
        }
        this.formMode.set(mode);
        this.formVisible.set(true);
        this.activeSection.set('basic');
        this.wizardActive.set(false);
        this.highestUnlockedStep.set(3);
        this.fieldErrors.set({});
        this.saveError.set(null);
        this.showAppPassword.set(false);
        this.form.set(this.ensureChildRows(data));
        this.refreshPhotoPreview(data.photoPath);
        this.captureDocumentsSnapshot(this.form().documents);
      });
  }

  cancel(): void {
    this.tryCloseForm();
  }

  tryCloseForm(): boolean {
    this.closeForm();
    return true;
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.wizardActive.set(false);
    this.highestUnlockedStep.set(1);
    this.activeSection.set('basic');
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.showAppPassword.set(false);
    this.loadList();
  }

  sectionStep(section: FormSection): number {
    return FORM_STEPS.find((s) => s.id === section)?.step ?? 1;
  }

  isSectionEnabled(section: FormSection): boolean {
    if (!this.isWizardFlow()) return true;
    return this.sectionStep(section) <= this.highestUnlockedStep();
  }

  isSectionCompleted(section: FormSection): boolean {
    if (!this.isWizardFlow()) return false;
    return this.sectionStep(section) < this.sectionStep(this.activeSection());
  }

  setSection(section: FormSection): void {
    if (!this.isSectionEnabled(section)) return;
    this.activeSection.set(section);
    if (section === 'documents') {
      const orgId = this.form().orgID ?? this.listFilter().orgId;
      const underOrgId = this.resolveDocumentUnderOrgId(orgId);
      if (underOrgId && !(this.masterLookups()?.documents?.length ?? 0)) {
        this.reloadDocumentLookups(underOrgId);
      }
    }
  }

  saveAndNext(): void {
    this.persistTeacher({ advance: true, close: false });
  }

  saveAndFinish(): void {
    this.persistTeacher({ advance: false, close: true });
  }

  onFormSubmit(): void {
    if (this.isViewMode()) return;
    if (this.isWizardFlow()) {
      if (this.isLastWizardStep()) this.saveAndFinish();
      else this.saveAndNext();
      return;
    }
    this.persistTeacher({ advance: false, close: true });
  }

  updateForm<K extends keyof TeacherFormState>(key: K, value: TeacherFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    if (key === 'dob' || key === 'retirementYear') {
      this.applyRetireDateFromDobAndLeaveYear();
    }
    if (key === 'dateOfWorkingStart') {
      this.applyGradeDatesFromWorkingStart();
    }
  }

  onDesignationChange(code: number | null): void {
    const leaveYear = this.masterLookups()?.designations.find((d) => d.code === code)?.leaveYear ?? null;
    this.form.update((f) => ({
      ...f,
      designationCode: code,
      retirementYear: leaveYear
    }));
    this.applyRetireDateFromDobAndLeaveYear();
  }

  /** Date of Working Start + 12/24 years → last day of that month. */
  private applyGradeDatesFromWorkingStart(): void {
    const start = this.form().dateOfWorkingStart;
    const payment = computeSeniorGradeDateIso(start);
    const nivad = computeSelectionGradeDateIso(start);
    if (!payment && !nivad) return;
    this.form.update((f) => ({
      ...f,
      paymentGradeDate: payment ?? f.paymentGradeDate,
      nivadGradeDate: nivad ?? f.nivadGradeDate
    }));
  }

  /** DOB + Retirement Year → last day of that month (Retire Date). */
  private applyRetireDateFromDobAndLeaveYear(): void {
    const f = this.form();
    const retire = computeRetireDateIso(f.dob, f.retirementYear);
    if (!retire) return;
    this.form.update((cur) => ({ ...cur, serviceOutDate: retire }));
  }

  onOrgChange(orgId: number | null): void {
    this.form.update((f) => ({ ...f, orgID: orgId }));
    const underOrgId = this.resolveDocumentUnderOrgId(orgId);
    if (underOrgId) this.reloadDocumentLookups(underOrgId);
    if (orgId && !this.form().userID) {
      this.teacherService
        .getNextSrNo(orgId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((srNo) => {
          if (srNo) this.updateForm('srNo', srNo);
        });
    }
  }

  onSchoolOrgChange(index: number, orgId: number | null): void {
    const org = this.schoolOrgs().find((o) => o.orgID === orgId);
    this.form.update((f) => {
      const schools = [...f.schools];
      schools[index] = {
        ...schools[index],
        orgID: orgId,
        schoolCode: org?.schoolCode ?? schools[index].schoolCode
      };
      return { ...f, schools };
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const orgId = this.form().orgID ?? this.listFilter().orgId;
    if (!orgId) {
      this.toast.showError('Please select School / Organization before uploading photo.');
      input.value = '';
      return;
    }
    const photoError = validateTeacherPhoto(file);
    if (photoError) {
      this.toast.showError(photoError);
      input.value = '';
      return;
    }
    this.photoUploading.set(true);
    this.teacherService
      .uploadPhoto(file, orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ path: storedName, error }) => {
        this.photoUploading.set(false);
        input.value = '';
        if (!storedName) {
          this.toast.showError(error ?? 'Unable to upload photo.');
          return;
        }
        this.form.update((f) => ({ ...f, photoPath: storedName }));
        this.refreshPhotoPreview(storedName, file);
      });
  }

  private refreshPhotoPreview(photoPath: string | null | undefined, localFile?: File): void {
    if (localFile) {
      const objectUrl = URL.createObjectURL(localFile);
      this.form.update((f) => ({ ...f, photoPreviewUrl: objectUrl }));
      return;
    }
    const url = this.teacherService.photoUrl(photoPath);
    if (!url) {
      this.form.update((f) => ({ ...f, photoPreviewUrl: null }));
      return;
    }
    this.teacherService
      .downloadFile(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this.form.update((f) => ({ ...f, photoPreviewUrl: objectUrl }));
        },
        error: () => this.form.update((f) => ({ ...f, photoPreviewUrl: null }))
      });
  }

  addDocumentRow(): void {
    this.form.update((f) => ({
      ...f,
      documents: [...f.documents, this.createDocumentLine()]
    }));
  }

  removeDocumentRow(index: number): void {
    this.form.update((f) => {
      const documents = f.documents.filter((_, i) => i !== index);
      return { ...f, documents: documents.length ? documents : [this.createDocumentLine()] };
    });
    this.persistDocuments({ silent: true });
  }

  updateDocument(index: number, patch: Partial<TeacherDocumentLine>, options?: { persist?: boolean }): void {
    if (patch.empDocumentCode != null && patch.empDocumentCode > 0) {
      const isDuplicate = this.form().documents.some((row, i) => i !== index && row.empDocumentCode === patch.empDocumentCode);
      if (isDuplicate) {
        this.saveError.set(DUPLICATE_DOCUMENT_NAME_MESSAGE);
        this.toast.showError(DUPLICATE_DOCUMENT_NAME_MESSAGE, 'Duplicate document');
        return;
      }
    }
    this.saveError.set(null);
    this.form.update((f) => {
      const documents = [...f.documents];
      documents[index] = { ...documents[index], ...patch };
      return { ...f, documents };
    });
    if (options?.persist !== false) {
      const row = this.form().documents[index];
      if (patch.empDocumentPath != null || (patch.empDocumentCode != null && row.empDocumentPath?.trim())) {
        this.persistDocuments({ silent: true });
      }
    }
  }

  onDocumentFileSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const row = this.form().documents[index];
    if (!row?.empDocumentCode) {
      this.toast.showError('Please select Document Name before uploading.', 'Document required');
      input.value = '';
      return;
    }
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      this.toast.showError('Only PDF, JPG, JPEG, and PNG files are allowed.', 'Invalid file');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.showError('Maximum file size is 5 MB.', 'File too large');
      input.value = '';
      return;
    }
    const userId = this.form().userID;
    if (!userId) {
      this.toast.showError('Save the teacher first, then upload documents.', 'Teacher required');
      input.value = '';
      return;
    }
    const orgId = this.form().orgID ?? this.listFilter().orgId;
    if (!orgId) {
      this.toast.showError('Please select School / Organization before uploading document.', 'Organization required');
      input.value = '';
      return;
    }
    this.teacherService
      .uploadDocument(file, orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ path: storedName, error }) => {
        input.value = '';
        if (!storedName) {
          this.toast.showError(error ?? 'Unable to upload document.', 'Upload failed');
          return;
        }
        this.updateDocument(index, { empDocumentPath: storedName, selectedFileName: file.name }, { persist: false });
        this.persistDocuments({
          silent: true,
          onSuccess: () => this.toast.showSuccess('Document uploaded successfully.', 'Uploaded'),
          onError: (message) => this.toast.showError(message ?? 'Unable to save document.', 'Save failed')
        });
      });
  }

  openDocument(path: string | null | undefined): void {
    const url = this.teacherService.documentUrl(path);
    if (!url) return;
    this.teacherService
      .downloadFile(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          window.open(objectUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: () => this.toast.showError('Unable to open document.')
      });
  }

  documentDisplayName(row: TeacherDocumentLine): string {
    return row.selectedFileName || (row.empDocumentPath ? row.empDocumentPath.split(/[/\\]/).pop() || row.empDocumentPath : '') || 'No file chosen';
  }

  /** Document types already picked in other rows are hidden from this row's dropdown. */
  documentTypesForRow(index: number) {
    const rows = this.form().documents;
    const currentCode = rows[index]?.empDocumentCode ?? null;
    const usedCodes = new Set(
      rows
        .filter((_, i) => i !== index)
        .map((r) => r.empDocumentCode)
        .filter((code): code is number => code != null && code > 0)
    );
    return (this.masterLookups()?.documents ?? []).filter(
      (d) => !usedCodes.has(d.code) || d.code === currentCode
    );
  }

  addSchoolRow(): void {
    this.form.update((f) => ({
      ...f,
      schools: [...f.schools, this.createSchoolLine(f.schools.length + 1)]
    }));
  }

  removeSchoolRow(index: number): void {
    this.form.update((f) => {
      const schools = f.schools.filter((_, i) => i !== index).map((row, i) => ({ ...row, srNo: i + 1 }));
      return { ...f, schools: schools.length ? schools : [this.createSchoolLine(1)] };
    });
  }

  updateSchool(index: number, patch: Partial<TeacherSchoolLine>): void {
    this.form.update((f) => {
      const schools = [...f.schools];
      schools[index] = { ...schools[index], ...patch };
      return { ...f, schools };
    });
  }

  save(): void {
    this.persistTeacher({ advance: false, close: true });
  }

  private persistDocuments(options?: { silent?: boolean; onSuccess?: () => void; onError?: (message: string) => void }): void {
    const userId = this.form().userID;
    if (this.isViewMode()) return;
    if (!userId) {
      const message = 'Save the teacher first, then upload documents.';
      if (options?.onError) options.onError(message);
      else if (!options?.silent) this.saveError.set(message);
      return;
    }

    const docError = getTeacherDocumentsSaveError(this.form().documents);
    if (docError) {
      if (options?.onError) options.onError(docError);
      else if (!options?.silent) this.saveError.set(docError);
      return;
    }

    if (!options?.silent) {
      this.loading.set(true);
      this.saveError.set(null);
      this.fieldErrors.set({});
    }

    this.teacherService
      .saveDocuments(userId, this.form().documents)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        if (!options?.silent) this.loading.set(false);
        if (!data) {
          const err = message ?? 'Unable to save documents.';
          if (options?.onError) options.onError(err);
          else if (!options?.silent) this.saveError.set(err);
          return;
        }
        this.form.update((f) => ({
          ...f,
          documents: data.documents.length ? data.documents : [this.createDocumentLine()]
        }));
        this.captureDocumentsSnapshot(this.form().documents);
        options?.onSuccess?.();
      });
  }

  private persistTeacher(options: { advance: boolean; close: boolean }): void {
    if (this.isViewMode()) return;
    if (!this.validateCurrentStep()) return;

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    const current = this.form();
    const withName = {
      ...current,
      employeeName: buildEmployeeName(current.firstname, current.middleName, current.lastName) || current.employeeName
    };
    const payload = this.formMode() === 'new'
      ? { ...withName, isActive: true }
      : withName;
    this.teacherService
      .save(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data: saved, message }) => {
        this.loading.set(false);
        if (!saved) {
          const mapped = message ? mapTeacherBackendMessageToFieldErrors(message) : { _form: 'Unable to save teacher.' };
          if (mapped['_form']) this.saveError.set(mapped['_form']);
          this.fieldErrors.set(mapped);
          toastOnSave(this.toast, false, { entity: 'Teacher', mode: this.formMode(), errorMessage: message ?? 'Unable to save teacher.' });
          return;
        }

        const wasNew = !this.form().userID;
        this.form.set(this.ensureChildRows(saved));
        this.captureDocumentsSnapshot(this.form().documents);
        this.formMode.set('edit');
        this.refreshPhotoPreview(saved.photoPath);

        if (this.isWizardFlow()) {
          const currentStep = this.sectionStep(this.activeSection());
          this.highestUnlockedStep.update((max) => Math.max(max, currentStep + 1));

          if (options.advance) {
            const next = this.nextSection(this.activeSection());
            if (next) {
              this.activeSection.set(next);
              toastOnSave(this.toast, true, {
                entity: wasNew && currentStep === 1 ? 'Basic details' : 'Teacher',
                mode: wasNew ? 'new' : 'edit'
              });
              return;
            }
          }

          if (options.close) {
            toastOnSave(this.toast, true, { entity: 'Teacher', mode: wasNew ? 'new' : 'edit' });
            this.closeForm();
            return;
          }
        }

        toastOnSave(this.toast, true, { entity: 'Teacher', mode: this.formMode() });
        if (options.close) this.closeForm();
      });
  }

  private validateCurrentStep(): boolean {
    if (this.activeSection() !== 'basic') return true;

    const f = this.form();
    const errors = validateTeacherForm(f, { requirePassword: !f.userID });
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.activeSection.set('basic');
      return false;
    }
    return true;
  }

  private nextSection(current: FormSection): FormSection | null {
    const index = SECTION_ORDER.indexOf(current);
    if (index < 0 || index >= SECTION_ORDER.length - 1) return null;
    return SECTION_ORDER[index + 1];
  }

  deleteTeacher(item: TeacherListItem): void {
    if (!confirm(`Deactivate teacher ${this.teacherName(item)}?`)) return;
    this.teacherService
      .delete(item.userID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.toast.showSuccess('Teacher deactivated.');
          this.loadList();
        } else {
          this.toast.showError('Unable to deactivate teacher.');
        }
      });
  }

  toggleAppPassword(): void {
    this.showAppPassword.update((v) => !v);
  }

  printTeacher(): void {
    window.print();
  }

  goToListPage(index: number): void {
    const max = this.listPageCount() - 1;
    this.listPageIndex.set(Math.max(0, Math.min(index, max)));
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPageIndex.set(0);
  }

  teacherName(item: TeacherListItem): string {
    return item.displayName || [item.firstname, item.middleName, item.lastName].filter(Boolean).join(' ');
  }

  subjectsLabel(item: TeacherListItem): string {
    return [item.subjectName1, item.subjectName2, item.subjectName3].filter(Boolean).join(', ') || '—';
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private ensureChildRows(data: TeacherFormState): TeacherFormState {
    return {
      ...data,
      documents: data.documents.length ? data.documents : [this.createDocumentLine()],
      schools: data.schools.length ? data.schools : [this.createSchoolLine(1)]
    };
  }

  private createDocumentLine(): TeacherDocumentLine {
    return {
      rowId: `doc-${++this.docSeq}`,
      empDocumentCode: null,
      empDocumentPath: '',
      selectedFileName: null
    };
  }

  private captureDocumentsSnapshot(documents?: TeacherDocumentLine[]): void {
    const docs = documents ?? this.form().documents;
    this.savedDocumentsJson = serializeTeacherDocuments(docs);
  }

  private createSchoolLine(srNo: number): TeacherSchoolLine {
    return {
      rowId: `sch-${++this.schoolSeq}`,
      srNo,
      orgID: null,
      schoolCode: null,
      designationCode: null,
      teachClass: '',
      teachSubject: '',
      schoolJoiningDate: todayIsoDate(),
      schoolLeaveDate: '',
      sansthaTransferOrderNoAndDate: '',
      zpTransferOrderNoAndDate: ''
    };
  }

  private emptyForm(): TeacherFormState {
    return {
      userID: null,
      srNo: null,
      orgID: null,
      staffTypeID: TEACHER_STAFF_TYPE_ID,
      userRoleID: null,
      designationCode: null,
      firstname: '',
      middleName: '',
      lastName: '',
      employeeName: '',
      employeeShortName: '',
      permanentAddress: '',
      cityName: '',
      photoPath: '',
      photoPreviewUrl: null,
      genderCode: null,
      dob: todayIsoDate(),
      adharCardNo: '',
      nationalCode: '',
      agid: null,
      shalarthID: '',
      scaleOfPay: '',
      casteName: '',
      religionID: null,
      categoryID: null,
      bloodGroupID: null,
      mobileNo1: '',
      mobileNo2: '',
      emailID: '',
      panNo: '',
      remark: '',
      subjectName1: '',
      subjectName2: '',
      subjectName3: '',
      sQualification: '',
      bQualification: '',
      afterDegreePassedSubjects: '',
      sansthaOrderNoAndDate: '',
      zpOrderNoAndDate: '',
      sansthaServiceOrderNoAndDate: '',
      zpServiceOrderNoAndDate: '',
      dateOfWorkingStart: todayIsoDate(),
      doWSCurrentSchool: todayIsoDate(),
      jtCategoryID: null,
      paymentGradeDate: todayIsoDate(),
      nivadGradeDate: todayIsoDate(),
      retirementYear: null,
      serviceOutDate: todayIsoDate(),
      shiftID: null,
      appUserName: '',
      appPassword: '',
      closeFlag: false,
      isActive: true,
      createdDate: '',
      modifiedDate: '',
      createdUserID: null,
      modifiedUserID: null,
      documents: [this.createDocumentLine()],
      schools: [this.createSchoolLine(1)]
    };
  }
}
