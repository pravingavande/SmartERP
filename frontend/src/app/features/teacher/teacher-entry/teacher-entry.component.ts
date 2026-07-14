import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subject, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  TeacherFormState,
  TeacherListFilter,
  TeacherListItem,
  TeacherLookupsBundle,
  TEACHER_STAFF_TYPE_ID
} from '../../../core/models/teacher.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { OrgOption } from '../../../core/models/audit.model';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { TeacherService } from '../../../core/services/teacher.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors } from '../../../core/utils/form-field-errors';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { isSansthaAdminUser } from '../../../core/utils/org-access.util';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import {
  mapTeacherBackendMessageToFieldErrors,
  validateTeacherForm,
  validateTeacherPhoto
} from '../../../core/utils/teacher-validation.util';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-teacher-entry',
  imports: [FormsModule, MarathiNumberInputDirective],
  templateUrl: './teacher-entry.component.html',
  styleUrl: './teacher-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherEntryComponent {
  private readonly teacherService = inject(TeacherService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly filterChanges$ = new Subject<void>();
  private filterDebounceSubscribed = false;

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
  readonly listFilter = signal<TeacherListFilter>({ isActive: true });
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);
  readonly resetPasswordValue = signal('');

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
  readonly schoolOrgs = computed(() => {
    const orgs = this.lookups()?.orgs ?? [];
    const sansthaId = this.auth.currentUser()?.sansthaId;
    if (!sansthaId) return orgs;
    return orgs.filter((o) => o.orgID !== sansthaId);
  });
  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly displayName = computed(() => {
    const f = this.form();
    return [f.firstname, f.middleName, f.lastName].filter(Boolean).join(' ').trim() || 'Teacher';
  });

  constructor() {
    this.filterChanges$
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

    this.destroyRef.onDestroy(() => this.filterChanges$.complete());
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.errorMessage.set(null);
    this.ensureFilterDebounce();
    forkJoin({
      lookups: this.teacherService.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data) {
          this.errorMessage.set('Unable to load teacher masters. Please refresh or contact admin.');
          return;
        }
        if (!data.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
          return;
        }
        const defaultOrg = this.resolveDefaultOrgId(data.orgs, profile);
        this.listFilter.update((f) => ({ ...f, orgId: defaultOrg }));
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

  private ensureFilterDebounce(): void {
    if (this.filterDebounceSubscribed) return;
    this.filterDebounceSubscribed = true;
    this.filterChanges$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  updateListFilter<K extends keyof TeacherListFilter>(key: K, value: TeacherListFilter[K]): void {
    this.listFilter.update((f) => ({ ...f, [key]: value }));
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
  }

  onSearchChange(value: string): void {
    this.updateListFilter('search', value);
  }

  loadList(): void {
    this.filterChanges$.next();
  }

  newTeacher(): void {
    const orgId = this.listFilter().orgId ?? this.resolveDefaultOrgId(this.lookups()?.orgs ?? [], null);
    if (!orgId && this.isSansthaUser()) {
      this.errorMessage.set('Select a school on the list page before adding a new teacher.');
      return;
    }

    this.errorMessage.set(null);
    this.formMode.set('new');
    this.formVisible.set(true);
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
        this.fieldErrors.set({});
        this.saveError.set(null);
        this.resetPasswordValue.set('');
        this.form.set(data);
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
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.loadList();
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

  save(): void {
    if (this.isViewMode()) return;
    const f = this.form();
    const errors = validateTeacherForm(f, { requirePassword: !f.userID });
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.teacherService
      .save(f)
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
        this.form.set(saved);
        this.formMode.set('edit');
        toastOnSave(this.toast, true, { entity: 'Teacher', mode: this.formMode() });
      });
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
      permanentAddress: '',
      cityName: '',
      photoPath: '',
      photoPreviewUrl: null,
      genderCode: null,
      dob: '',
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
      dateOfWorkingStart: '',
      jtCategoryID: null,
      paymentGradeDate: '',
      nivadGradeDate: '',
      retirementYear: null,
      serviceOutDate: '',
      shiftID: null,
      appUserName: '',
      appPassword: '',
      closeFlag: false,
      isActive: true,
      createdAt: ''
    };
  }
}
