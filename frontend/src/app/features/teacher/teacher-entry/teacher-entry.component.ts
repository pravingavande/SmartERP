import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
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
import { OrgOption } from '../../../core/models/audit.model';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { LanguageService } from '../../../core/services/language.service';
import { TeacherService } from '../../../core/services/teacher.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors } from '../../../core/utils/form-field-errors';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { todayIsoDate } from '../../../core/utils/date.util';
import { isSansthaAdminUser } from '../../../core/utils/org-access.util';
import { buildEmployeeName } from '../../../core/utils/employee-name.util';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import {
  mapTeacherBackendMessageToFieldErrors,
  validateTeacherForm,
  validateTeacherPhoto
} from '../../../core/utils/teacher-validation.util';

type FormMode = 'new' | 'edit' | 'view';
type FormSection = 'basic' | 'documents' | 'schools';

interface FormStep {
  id: FormSection;
  step: number;
  label: string;
}

const FORM_STEPS: FormStep[] = [
  { id: 'basic', step: 1, label: 'Basic Details' },
  { id: 'documents', step: 2, label: 'Documents' },
  { id: 'schools', step: 3, label: 'School History' }
];

const SECTION_ORDER: FormSection[] = ['basic', 'documents', 'schools'];

@Component({
  selector: 'app-teacher-entry',
  imports: [FormsModule, MarathiNumberInputDirective, ListActionBtnComponent],
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
  readonly listFilter = signal<TeacherListFilter>({ isActive: null });
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);
  readonly resetPasswordValue = signal('');
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
  readonly isSansthaUser = computed(() => isSansthaAdminUser(this.auth.currentUser()?.userRoleId));
  readonly schoolOrgs = computed(() => this.lookups()?.orgs ?? []);
  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isWizardFlow = computed(() => this.wizardActive() && !this.isViewMode());
  readonly isLastWizardStep = computed(() => this.activeSection() === 'schools');
  readonly displayName = computed(() => {
    const f = this.form();
    return f.employeeName?.trim()
      || [f.firstname, f.middleName, f.lastName].filter(Boolean).join(' ').trim()
      || 'Teacher';
  });
  readonly employeeNamePreview = computed(() => {
    const f = this.form();
    return buildEmployeeName(f.firstname, f.middleName, f.lastName);
  });

  private docSeq = 0;
  private schoolSeq = 0;

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
      lookups: this.teacherService.getLookups(),
      profile: this.dashboardService.getProfile(),
      language: this.languageService.load(underOrgID)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.userProfile.set(profile);
        if (!data) {
          this.errorMessage.set('Unable to load teacher masters. Please refresh or contact admin.');
          this.loadList();
          return;
        }
        this.lookups.set(data);
        if (!data.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
        }
        this.loadList();
      });
  }

  private resolveDefaultOrgId(orgs: OrgOption[], profile: UserProfile | null): number | null {
    if (this.isSansthaUser()) return null;
    if (profile?.schoolCode) {
      const match = orgs.find((o) => o.schoolCode === profile.schoolCode);
      if (match) return match.orgID;
    }
    if (profile?.orgId) {
      const match = orgs.find((o) => o.orgID === profile.orgId);
      if (match) return match.orgID;
    }
    return orgs.length === 1 ? orgs[0].orgID : null;
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
    this.closeForm();
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
    const orgId = this.listFilter().orgId ?? this.resolveDefaultOrgId(this.lookups()?.orgs ?? [], this.userProfile());
    if (!orgId && this.isSansthaUser()) {
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
    this.resetPasswordValue.set('');
    const empty = this.emptyForm();
    this.form.set(empty);
    if (orgId) this.onOrgChange(orgId);
  }

  editTeacher(item: TeacherListItem): void {
    this.loading.set(true);
    this.teacherService
      .getById(item.userID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.loading.set(false);
        if (!data) {
          this.errorMessage.set('Unable to load teacher.');
          return;
        }
        this.formMode.set('edit');
        this.formVisible.set(true);
        this.activeSection.set('basic');
        this.wizardActive.set(false);
        this.highestUnlockedStep.set(3);
        this.fieldErrors.set({});
        this.saveError.set(null);
        this.resetPasswordValue.set('');
        this.form.set(this.ensureChildRows(data));
      });
  }

  viewTeacher(item: TeacherListItem): void {
    this.editTeacher(item);
    this.formMode.set('view');
  }

  cancel(): void {
    this.closeForm();
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.wizardActive.set(false);
    this.highestUnlockedStep.set(1);
    this.activeSection.set('basic');
    this.fieldErrors.set({});
    this.saveError.set(null);
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
  }

  onOrgChange(orgId: number | null): void {
    this.form.update((f) => ({ ...f, orgID: orgId }));
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
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const photoError = validateTeacherPhoto(file);
    if (photoError) {
      this.toast.showError(photoError);
      return;
    }
    this.photoUploading.set(true);
    this.teacherService
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((storedName) => {
        this.photoUploading.set(false);
        if (!storedName) {
          this.toast.showError('Unable to upload photo.');
          return;
        }
        this.form.update((f) => ({
          ...f,
          photoPath: storedName,
          photoPreviewUrl: this.teacherService.photoUrl(storedName)
        }));
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
  }

  updateDocument(index: number, patch: Partial<TeacherDocumentLine>): void {
    this.form.update((f) => {
      const documents = [...f.documents];
      documents[index] = { ...documents[index], ...patch };
      return { ...f, documents };
    });
  }

  onDocumentFileSelected(index: number, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.updateDocument(index, { empDocumentPath: file.name, selectedFileName: file.name });
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

  private persistTeacher(options: { advance: boolean; close: boolean }): void {
    if (this.isViewMode()) return;
    if (!this.validateCurrentStep()) return;

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    const payload = this.formMode() === 'new'
      ? { ...this.form(), isActive: true }
      : this.form();
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
        this.formMode.set('edit');

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

  resetPassword(): void {
    const userId = this.form().userID;
    const password = this.resetPasswordValue().trim();
    if (!userId) return;
    if (!password) {
      this.fieldErrors.update((e) => ({ ...e, resetPassword: 'Enter a new password.' }));
      return;
    }
    this.teacherService
      .resetPassword(userId, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.toast.showSuccess('Password reset.');
          this.resetPasswordValue.set('');
        } else {
          this.toast.showError('Unable to reset password.');
        }
      });
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
      jtCategoryID: null,
      paymentGradeDate: todayIsoDate(),
      nivadGradeDate: todayIsoDate(),
      retirementYear: null,
      serviceOutDate: '',
      shiftID: null,
      appUserName: '',
      appPassword: '',
      closeFlag: false,
      isActive: true,
      createdAt: '',
      documents: [this.createDocumentLine()],
      schools: [this.createSchoolLine(1)]
    };
  }
}
