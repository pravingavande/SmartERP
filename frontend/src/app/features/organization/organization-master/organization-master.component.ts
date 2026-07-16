import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  OrganizationDocumentLine,
  OrganizationDocumentOption,
  OrganizationFormState,
  OrganizationListFilter,
  OrganizationListItem,
  OrganizationLookups,
  SANSTHA_BUSINESS_CATEGORY_ID,
  SCHOOL_BUSINESS_CATEGORY_ID
} from '../../../core/models/organization.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows } from '../../../core/utils/master-list.util';
import { mapOrganizationBackendMessage, validateOrganizationForm } from '../../../core/utils/organization-validation.util';
import { resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';

type FormMode = 'new' | 'edit' | 'view';
type FormTab = 'basic' | 'documents';

const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_DOC_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-organization-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent, MarathiNumberInputDirective, OrgSchoolSelectComponent],
  templateUrl: './organization-master.component.html',
  styleUrl: './organization-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrganizationMasterComponent {
  private readonly organization = inject(OrganizationService);
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<OrganizationLookups | null>(null);
  readonly documentOptions = signal<OrganizationDocumentOption[]>([]);
  readonly items = signal<OrganizationListItem[]>([]);
  readonly form = signal<OrganizationFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly activeTab = signal<FormTab>('basic');
  readonly listFilter = signal<OrganizationListFilter>(this.emptyFilter());
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);
  readonly userProfile = signal<UserProfile | null>(null);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isEditMode = computed(() => this.formMode() === 'edit');
  readonly isNewMode = computed(() => this.formMode() === 'new');
  readonly documentsTabEnabled = computed(() => !!this.form().orgID);
  readonly isSchoolCategory = computed(() => this.form().businessCategoryID === SCHOOL_BUSINESS_CATEGORY_ID);
  readonly isSansthaCategory = computed(() => this.form().businessCategoryID === SANSTHA_BUSINESS_CATEGORY_ID);
  /** UserRoleID 3 (Employee) — view/edit only; cannot add or delete. */
  readonly canManageOrganizations = computed(() => this.auth.currentUser()?.userRoleId !== 3);
  /** Same as Teacher Master — orgs already filtered in OrganizationService via auth.filterSchoolOrgs. */
  readonly schoolOrgs = computed(() => this.lookups()?.orgs ?? []);
  /** Form Org / School select value: school itself on edit, list selection context on new. */
  readonly formOrgSelectValue = computed(() => {
    if (this.isNewMode()) return this.listFilter().orgId ?? this.form().underOrgID ?? null;
    return this.form().orgID ?? this.form().underOrgID ?? null;
  });
  readonly listPageCount = computed(() => pageCount(this.items().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.items(), this.listPageIndex(), this.listPageSize()));
  readonly listPageStart = computed(() => pageRange(this.items().length, this.listPageIndex(), this.listPageSize()).start);

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      lookups: this.organization.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.userProfile.set(profile);
        this.lookups.set(data);
        if (!data) {
          this.errorMessage.set('Unable to load organization masters. Please refresh or contact admin.');
          this.items.set([]);
          return;
        }
        if (!data.orgs?.length) {
          this.errorMessage.set('No schools found for your login. Contact admin to map org access.');
          this.items.set([]);
          return;
        }
        // Same default selection as Teacher Master
        const orgId = resolveDefaultSchoolOrgId(data.orgs, profile);
        this.listFilter.update((f) => ({ ...f, orgId }));
        this.loadList();
      });
  }

  loadList(): void {
    const orgId = this.listFilter().orgId;
    // Same as Teacher Master — only load for selected school
    if (!orgId) {
      this.listLoading.set(false);
      this.items.set([]);
      this.listPageIndex.set(0);
      return;
    }
    this.listLoading.set(true);
    this.organization.getList(this.listFilter()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rows) => {
      this.listLoading.set(false);
      this.items.set(rows);
      this.listPageIndex.set(0);
    });
  }

  onFilterChange<K extends keyof OrganizationListFilter>(key: K, value: OrganizationListFilter[K]): void {
    this.listFilter.update((f) => ({ ...f, [key]: value }));
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
  }

  newItem(): void {
    if (!this.canManageOrganizations()) {
      this.toast.showError('Employees cannot add organizations.', 'Access Denied');
      return;
    }
    const lookups = this.lookups();
    const orgId =
      this.listFilter().orgId ?? resolveDefaultSchoolOrgId(this.schoolOrgs(), this.userProfile());
    if (!orgId) {
      this.errorMessage.set('Select a school on the list page before adding a new organization.');
      return;
    }
    this.errorMessage.set(null);
    this.formMode.set('new');
    this.formVisible.set(true);
    this.activeTab.set('basic');
    this.saveError.set(null);
    this.fieldErrors.set({});
    const selected = this.schoolOrgs().find((s) => s.orgID === orgId);
    const parentId = this.resolveParentOrgId(orgId, selected?.underOrgID);
    const defaultSchoolCategory = lookups?.schoolCategories.find((s) => s.id > 0)?.id ?? null;
    const ownerBusinessCategory = selected?.businessCategoryID ?? SCHOOL_BUSINESS_CATEGORY_ID;
    this.form.set({
      ...this.emptyForm(),
      businessCategoryID: ownerBusinessCategory === SANSTHA_BUSINESS_CATEGORY_ID
        ? SCHOOL_BUSINESS_CATEGORY_ID
        : (ownerBusinessCategory || SCHOOL_BUSINESS_CATEGORY_ID),
      underOrgID: parentId,
      schoolCategoryID: defaultSchoolCategory
    });
    this.documentOptions.set([]);
    if (parentId) this.refreshNextSrNo(parentId);
  }

  onFormOrgChange(orgId: number | null): void {
    const selected = this.schoolOrgs().find((s) => s.orgID === orgId);
    const parentId = orgId ? this.resolveParentOrgId(orgId, selected?.underOrgID) : null;
    this.updateForm('underOrgID', parentId);
    if (parentId && this.isNewMode()) this.refreshNextSrNo(parentId);
  }

  /** Parent sanstha for a school; if selection is already a sanstha, use itself. */
  private resolveParentOrgId(orgId: number, underOrgId?: number | null): number {
    if (underOrgId && underOrgId > 0 && underOrgId !== orgId) return underOrgId;
    return orgId;
  }

  private refreshNextSrNo(underOrgId: number): void {
    this.organization.getNextSrNo(underOrgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((srNo) => {
      if (srNo) this.form.update((f) => ({ ...f, srNo }));
    });
  }

  viewItem(item: OrganizationListItem): void {
    this.openItem(item.orgID, 'view');
  }

  editItem(item: OrganizationListItem): void {
    this.openItem(item.orgID, 'edit');
  }

  private openItem(orgId: number, mode: FormMode): void {
    this.loading.set(true);
    this.organization.getById(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.loading.set(false);
      if (!data) {
        this.toast.showError('Organization not found.', 'Load failed');
        return;
      }
      this.formMode.set(mode);
      this.formVisible.set(true);
      this.activeTab.set('basic');
      this.saveError.set(null);
      this.fieldErrors.set({});
      this.form.set({ ...data, documents: data.documents.length ? data.documents : [this.emptyDocumentRow()] });
      if (data.businessCategoryID) this.refreshDocumentOptions(data.businessCategoryID, false);
    });
  }

  deleteItem(item: OrganizationListItem): void {
    if (!this.canManageOrganizations()) {
      this.toast.showError('Employees cannot delete organizations.', 'Access Denied');
      return;
    }
    if (!confirm(`Deactivate organization "${item.organizationName}"?`)) return;
    this.organization.delete(item.orgID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to deactivate organization.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Organization deactivated.', 'Deleted');
      this.loadList();
      if (this.form().orgID === item.orgID) this.closeForm();
    });
  }

  setTab(tab: FormTab): void {
    if (tab === 'documents' && !this.documentsTabEnabled()) return;
    this.activeTab.set(tab);
  }

  updateForm<K extends keyof OrganizationFormState>(key: K, value: OrganizationFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    this.fieldErrors.update((errors) => removeFieldError(errors, key as string));
    if (key === 'businessCategoryID' && typeof value === 'number') {
      this.onBusinessCategoryChange(value);
    }
  }

  private onBusinessCategoryChange(businessCategoryId: number): void {
    this.refreshDocumentOptions(businessCategoryId, true);
    if (businessCategoryId === SANSTHA_BUSINESS_CATEGORY_ID) {
      this.form.update((f) => ({ ...f, underOrgID: f.orgID }));
    }
  }

  private refreshDocumentOptions(businessCategoryId: number, resetRows: boolean): void {
    this.organization.getDocumentsByBusinessCategory(businessCategoryId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((opts) => {
      this.documentOptions.set(opts);
      if (resetRows) {
        this.form.update((f) => ({ ...f, documents: [this.emptyDocumentRow()] }));
      }
    });
  }

  addDocumentRow(): void {
    if (this.isViewMode()) return;
    this.form.update((f) => ({ ...f, documents: [...f.documents, this.emptyDocumentRow()] }));
  }

  removeDocumentRow(index: number): void {
    if (this.isViewMode()) return;
    this.form.update((f) => {
      const documents = f.documents.filter((_, i) => i !== index);
      return { ...f, documents: documents.length ? documents : [this.emptyDocumentRow()] };
    });
  }

  updateDocument(index: number, patch: Partial<OrganizationDocumentLine>): void {
    this.form.update((f) => ({
      ...f,
      documents: f.documents.map((row, i) => (i === index ? { ...row, ...patch } : row))
    }));
  }

  onDocumentFileSelected(index: number, event: Event): void {
    if (this.isViewMode()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
      this.toast.showError('Only PDF, JPG, JPEG, and PNG files are allowed.', 'Invalid file');
      input.value = '';
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      this.toast.showError('Maximum file size is 5 MB.', 'File too large');
      input.value = '';
      return;
    }

    const row = this.form().documents[index];
    if (!row.documentID) {
      this.toast.showError('Select document name first.', 'Document required');
      input.value = '';
      return;
    }

    this.organization
      .uploadDocument(file, this.form().orgID, row.documentID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((path) => {
        input.value = '';
        if (!path) {
          this.toast.showError('Unable to upload document.', 'Upload failed');
          return;
        }
        this.updateDocument(index, { documentPath: path, selectedFileName: file.name, pendingFile: null });
        this.toast.showSuccess('Document uploaded.', 'Uploaded');
      });
  }

  documentDisplayName(row: OrganizationDocumentLine): string {
    if (row.selectedFileName?.trim()) return row.selectedFileName.trim();
    const path = row.documentPath?.trim();
    if (!path) return 'No file chosen';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }

  openDocument(path: string | null | undefined): void {
    if (!path?.trim()) return;
    this.organization.downloadFile(this.organization.fileUrl(path)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => this.toast.showError('Unable to open document.', 'View failed')
    });
  }

  downloadDocument(path: string | null | undefined): void {
    if (!path?.trim()) return;
    this.organization.downloadFile(this.organization.fileUrl(path)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = path;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => this.toast.showError('Unable to download document.', 'Download failed')
    });
  }

  saveBasic(): void {
    if (this.isViewMode()) return;
    const current = this.formMode() === 'new'
      ? { ...this.form(), isActive: true }
      : this.form();
    const errors = validateOrganizationForm(current);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set('Please fix the highlighted fields.');
      return;
    }

    this.loading.set(true);
    this.saveError.set(null);
    this.organization.save(current).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        const backendErrors = message ? mapOrganizationBackendMessage(message) : {};
        if (hasFieldErrors(backendErrors)) this.fieldErrors.set(backendErrors);
        this.saveError.set(message ?? 'Unable to save organization.');
        return;
      }
      this.form.set({ ...data, documents: data.documents.length ? data.documents : [this.emptyDocumentRow()] });
      this.formMode.set('edit');
      this.toast.showSuccess('Organization saved.', 'Saved');
      this.loadList();
      this.closeForm();
    });
  }

  saveDocuments(): void {
    if (this.isViewMode() || !this.form().orgID) return;
    this.loading.set(true);
    this.organization.save(this.form()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.saveError.set(message ?? 'Unable to save documents.');
        return;
      }
      this.form.update((f) => ({ ...f, documents: data.documents.length ? data.documents : [this.emptyDocumentRow()] }));
      this.toast.showSuccess('Documents saved.', 'Saved');
    });
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.saveError.set(null);
    this.fieldErrors.set({});
  }

  cancel(): void {
    this.closeForm();
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  goToListPage(index: number): void {
    this.listPageIndex.set(index);
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPageIndex.set(0);
  }

  private emptyFilter(): OrganizationListFilter {
    return {
      search: '',
      businessCategoryID: null,
      schoolCategoryID: null,
      orgId: null,
      cityName: '',
      isActive: null
    };
  }

  private emptyForm(): OrganizationFormState {
    return {
      orgID: null,
      businessCategoryID: null,
      underOrgID: null,
      srNo: null,
      schoolCategoryID: null,
      organizationName: '',
      address: '',
      cityName: '',
      udiesNo: '',
      schoolTinNo: '',
      sharlarthID: '',
      panNo: '',
      emailID: '',
      phoneNo: '',
      mobileNo: '',
      webSite: '',
      establishmentYear: '',
      regNo: '',
      permission80G: '',
      remark: '',
      isActive: true,
      documents: [this.emptyDocumentRow()]
    };
  }

  private emptyDocumentRow(): OrganizationDocumentLine {
    return {
      rowId: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      documentID: null,
      documentPath: null,
      selectedFileName: null,
      pendingFile: null
    };
  }
}
