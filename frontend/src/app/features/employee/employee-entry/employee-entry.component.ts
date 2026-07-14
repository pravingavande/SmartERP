import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subject, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  EmployeeDocumentLine,
  EmployeeEducationLine,
  EmployeeFormState,
  EmployeeListItem,
  EmployeeLookupsBundle,
  EmployeeSchoolLine
} from '../../../core/models/employee.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { OrgOption } from '../../../core/models/audit.model';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors } from '../../../core/utils/form-field-errors';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { isSansthaAdminUser } from '../../../core/utils/org-access.util';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';

type FormMode = 'new' | 'edit' | 'view';
type FormSection = 'basic' | 'education' | 'documents' | 'schools';

interface FormStep {
  id: FormSection;
  step: number;
  label: string;
}

const FORM_STEPS: FormStep[] = [
  { id: 'basic', step: 1, label: 'Basic Details' },
  { id: 'education', step: 2, label: 'Education' },
  { id: 'documents', step: 3, label: 'Documents' },
  { id: 'schools', step: 4, label: 'School History' }
];

const SECTION_ORDER: FormSection[] = ['basic', 'education', 'documents', 'schools'];

@Component({
  selector: 'app-employee-entry',
  imports: [FormsModule, MarathiNumberInputDirective],
  templateUrl: './employee-entry.component.html',
  styleUrl: './employee-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeEntryComponent {
  private readonly employeeService = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges$ = new Subject<string>();
  private readonly listReload$ = new Subject<void>();
  private searchDebounceSubscribed = false;

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<EmployeeLookupsBundle | null>(null);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly form = signal<EmployeeFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly activeSection = signal<FormSection>('basic');
  readonly wizardActive = signal(false);
  readonly highestUnlockedStep = signal(1);
  readonly formSteps = FORM_STEPS;
  readonly listOrgID = signal<number | null>(null);
  readonly listSearch = signal('');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly masterLookups = computed(() => this.lookups()?.lookups);
  readonly paginatedEmployees = computed(() => {
    const list = this.employees();
    const start = this.listPageIndex() * this.listPageSize();
    return list.slice(start, start + this.listPageSize());
  });
  readonly listPageCount = computed(() => Math.max(1, Math.ceil(this.employees().length / this.listPageSize())));
  readonly listPageStart = computed(() => {
    const total = this.employees().length;
    if (!total) return 0;
    return this.listPageIndex() * this.listPageSize() + 1;
  });
  readonly listPageEnd = computed(() => {
    const total = this.employees().length;
    if (!total) return 0;
    return Math.min(total, (this.listPageIndex() + 1) * this.listPageSize());
  });
  readonly isSansthaUser = computed(() => isSansthaAdminUser(this.auth.currentUser()?.userRoleId));
  readonly schoolOrgs = computed(() => {
    const orgs = this.lookups()?.orgs ?? [];
    const sansthaId = this.auth.currentUser()?.sansthaId;
    if (!sansthaId) return orgs;
    return orgs.filter((o) => o.orgID !== sansthaId);
  });
  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isWizardFlow = computed(() => this.wizardActive() && !this.isViewMode());
  readonly isLastWizardStep = computed(() => this.activeSection() === 'schools');
  readonly displayName = computed(() => {
    const f = this.form();
    return [f.firstname, f.middleName, f.lastName].filter(Boolean).join(' ').trim() || 'Employee';
  });

  private eduSeq = 0;
  private docSeq = 0;
  private schoolSeq = 0;

  constructor() {
    this.listReload$
      .pipe(
        switchMap(() => {
          this.listLoading.set(true);
          return this.employeeService.getList(this.listOrgID(), this.listSearch());
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.listLoading.set(false);
        this.employees.set(list);
        const maxPage = Math.max(0, Math.ceil(list.length / this.listPageSize()) - 1);
        if (this.listPageIndex() > maxPage) {
          this.listPageIndex.set(maxPage);
        }
      });

    this.destroyRef.onDestroy(() => {
      this.searchChanges$.complete();
      this.listReload$.complete();
    });

    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.errorMessage.set(null);
    this.ensureSearchDebounce();
    forkJoin({
      lookups: this.employeeService.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data) {
          this.errorMessage.set('Unable to load employee masters. Please refresh or contact admin.');
          return;
        }
        if (!data.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
          return;
        }
        this.listOrgID.set(this.resolveDefaultOrgId(data.orgs, profile));
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

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
  }

  onSearchChange(value: string): void {
    this.listSearch.set(value);
    this.listPageIndex.set(0);
    this.searchChanges$.next(value);
  }

  goToListPage(index: number): void {
    const max = this.listPageCount() - 1;
    this.listPageIndex.set(Math.max(0, Math.min(index, max)));
    this.scrollListToTop();
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPageIndex.set(0);
    this.scrollListToTop();
  }

  private scrollListToTop(): void {
    const el = document.querySelector('.employee-page .records-table-scroll');
    el?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadList(): void {
    this.listReload$.next();
  }

  newEmployee(): void {
    const orgId = this.listOrgID() ?? this.resolveDefaultOrgId(this.lookups()?.orgs ?? [], null);
    if (!orgId && this.isSansthaUser()) {
      this.errorMessage.set('Select a school on the list page before adding a new employee.');
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
    this.form.set(this.emptyForm());
    if (orgId) this.onMainOrgChange(orgId);
  }

  editEmployee(item: EmployeeListItem): void {
    this.loading.set(true);
    this.employeeService
      .getById(item.userID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.loading.set(false);
        if (!data) {
          this.errorMessage.set('Unable to load employee.');
          return;
        }
        this.formMode.set('edit');
        this.formVisible.set(true);
        this.activeSection.set('basic');
        this.wizardActive.set(false);
        this.highestUnlockedStep.set(4);
        this.fieldErrors.set({});
        this.saveError.set(null);
        this.form.set(this.ensureChildRows(data));
      });
  }

  viewEmployee(item: EmployeeListItem): void {
    this.editEmployee(item);
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
    this.persistEmployee({ advance: true, close: false });
  }

  saveAndFinish(): void {
    this.persistEmployee({ advance: false, close: true });
  }

  onFormSubmit(): void {
    if (this.isViewMode()) return;
    if (this.isWizardFlow()) {
      if (this.isLastWizardStep()) this.saveAndFinish();
      else this.saveAndNext();
      return;
    }
    this.persistEmployee({ advance: false, close: true });
  }

  updateForm<K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  onMainOrgChange(orgId: number | null): void {
    const org = this.schoolOrgs().find((o) => o.orgID === orgId);
    this.form.update((f) => ({
      ...f,
      orgID: orgId,
      schoolCode: org?.schoolCode ?? f.schoolCode
    }));
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

  addEducationRow(): void {
    this.form.update((f) => ({
      ...f,
      education: [...f.education, this.createEducationLine(f.education.length + 1)]
    }));
  }

  removeEducationRow(index: number): void {
    this.form.update((f) => {
      const education = f.education.filter((_, i) => i !== index).map((row, i) => ({ ...row, srNo: i + 1 }));
      return { ...f, education: education.length ? education : [this.createEducationLine(1)] };
    });
  }

  updateEducation(index: number, patch: Partial<EmployeeEducationLine>): void {
    this.form.update((f) => {
      const education = [...f.education];
      education[index] = { ...education[index], ...patch };
      return { ...f, education };
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

  updateDocument(index: number, patch: Partial<EmployeeDocumentLine>): void {
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

  updateSchool(index: number, patch: Partial<EmployeeSchoolLine>): void {
    this.form.update((f) => {
      const schools = [...f.schools];
      schools[index] = { ...schools[index], ...patch };
      return { ...f, schools };
    });
  }

  save(): void {
    this.persistEmployee({ advance: false, close: true });
  }

  private persistEmployee(options: { advance: boolean; close: boolean }): void {
    if (this.isViewMode()) return;
    if (!this.validateCurrentStep()) return;

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.employeeService
      .save(this.form())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('Unable to save employee.');
          toastOnSave(this.toast, false, { entity: 'Employee', mode: this.formMode(), errorMessage: 'Unable to save employee.' });
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
                entity: wasNew && currentStep === 1 ? 'Basic details' : 'Employee',
                mode: wasNew ? 'new' : 'edit'
              });
              return;
            }
          }

          if (options.close) {
            toastOnSave(this.toast, true, { entity: 'Employee', mode: wasNew ? 'new' : 'edit' });
            this.closeForm();
            return;
          }
        }

        toastOnSave(this.toast, true, { entity: 'Employee', mode: this.formMode() });
        if (options.close) this.closeForm();
      });
  }

  private validateCurrentStep(): boolean {
    if (this.activeSection() !== 'basic') return true;

    const f = this.form();
    const errors: FieldErrors = {};
    if (!f.firstname?.trim()) errors['firstname'] = 'First name is required.';
    if (!f.mobileNo1?.trim()) errors['mobileNo1'] = 'Mobile no is required.';
    if (!f.orgID) errors['orgID'] = 'Org / School is required.';
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

  employeeName(item: EmployeeListItem): string {
    return item.displayName || [item.firstname, item.middleName, item.lastName].filter(Boolean).join(' ');
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private ensureChildRows(data: EmployeeFormState): EmployeeFormState {
    return {
      ...data,
      education: data.education.length ? data.education : [this.createEducationLine(1)],
      documents: data.documents.length ? data.documents : [this.createDocumentLine()],
      schools: data.schools.length ? data.schools : [this.createSchoolLine(1)]
    };
  }

  private createEducationLine(srNo: number): EmployeeEducationLine {
    return {
      rowId: `edu-${++this.eduSeq}`,
      srNo,
      educationCodePassExam: null,
      univercity: '',
      passingYear: '',
      percentage: '',
      qualificationTypeCode: null,
      educationStatusCode: null
    };
  }

  private createDocumentLine(): EmployeeDocumentLine {
    return {
      rowId: `doc-${++this.docSeq}`,
      empDocumentCode: null,
      empDocumentPath: '',
      selectedFileName: null
    };
  }

  private createSchoolLine(srNo: number): EmployeeSchoolLine {
    return {
      rowId: `sch-${++this.schoolSeq}`,
      srNo,
      orgID: null,
      schoolCode: null,
      designationCode: null,
      teachClass: '',
      teachSubject: '',
      schoolJoiningDate: '',
      schoolLeaveDate: '',
      sansthaTransferOrderNoAndDate: '',
      zpTransferOrderNoAndDate: ''
    };
  }

  private emptyForm(): EmployeeFormState {
    return {
      userID: null,
      schoolCode: null,
      orgID: null,
      userRoleID: null,
      designationCode: null,
      firstname: '',
      middleName: '',
      lastName: '',
      permanentAddress: '',
      localAddress: '',
      genderCode: null,
      dob: '',
      adharCardNo: '',
      mobileNo1: '',
      mobileNo2: '',
      emailID: '',
      panNo: '',
      remark: '',
      appUserName: '',
      appPassword: '',
      isActive: true,
      education: [this.createEducationLine(1)],
      documents: [this.createDocumentLine()],
      schools: [this.createSchoolLine(1)]
    };
  }
}
