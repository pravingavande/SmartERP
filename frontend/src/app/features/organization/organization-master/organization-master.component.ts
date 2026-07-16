import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
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
import { ToastService } from '../../../core/services/toast.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows } from '../../../core/utils/master-list.util';
import { mapOrganizationBackendMessage, validateOrganizationForm } from '../../../core/utils/organization-validation.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit' | 'view';
type FormTab = 'basic' | 'documents';

const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_DOC_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-organization-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent],
  templateUrl: './organization-master.component.html',
  styleUrl: './organization-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrganizationMasterComponent {
  private readonly organization = inject(OrganizationService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
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
  readonly hideBusinessCategoryOnNew = computed(() => this.isNewMode() && this.isSchoolCategory());
  readonly selectedSansthaName = computed(() => {
    const underOrgId = this.form().underOrgID;
    if (!underOrgId) return '—';
    return this.lookups()?.sansthaOrgs.find((s) => s.orgID === underOrgId)?.organizationName ?? '—';
  });
  readonly listPageCount = computed(() => pageCount(this.items().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.items(), this.listPageIndex(), this.listPageSize()));
  readonly listPageStart = computed(() => pageRange(this.items().length, this.listPageIndex(), this.listPageSize()).start);

  constructor() {
    this.dashboardService.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((profile) => {
      this.userProfile.set(profile);
    });
    this.loadLookups();
    this.loadList();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.organization.getLookups().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.lookupsLoading.set(false);
      this.lookups.set(data);
    });
  }

  loadList(): void {
    this.listLoading.set(true);
    this.organization.getList(this.listFilter()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rows) => {
      this.listLoading.set(false);
      this.items.set(rows);
      this.listPageIndex.set(0);
    });
  }

  onFilterChange<K extends keyof OrganizationListFilter>(key: K, value: OrganizationListFilter[K]): void {
    this.listFilter.update((f) => ({ ...f, [key]: value }));
    this.loadList();
  }

  newItem(): void {
    this.formMode.set('new');
    this.formVisible.set(true);
    this.activeTab.set('basic');
    this.saveError.set(null);
    this.fieldErrors.set({});
    const lookups = this.lookups();
    const defaultSchoolCategory = lookups?.schoolCategories.find((s) => s.id > 0)?.id ?? null;
    const defaultSansthaId = this.resolveDefaultSansthaId(lookups);
    const ownerBusinessCategory = lookups?.sansthaOrgs.find((s) => s.orgID === defaultSansthaId)?.businessCategoryID
      ?? SCHOOL_BUSINESS_CATEGORY_ID;
    this.form.set({
      ...this.emptyForm(),
      businessCategoryID: ownerBusinessCategory === SANSTHA_BUSINESS_CATEGORY_ID
        ? SCHOOL_BUSINESS_CATEGORY_ID
        : ownerBusinessCategory,
      underOrgID: defaultSansthaId,
      schoolCategoryID: defaultSchoolCategory
    });
    this.documentOptions.set([]);
    if (defaultSansthaId) this.refreshNextSrNo(defaultSansthaId);
  }

  onUnderSansthaChange(underOrgId: number | null): void {
    this.updateForm('underOrgID', underOrgId);
    if (underOrgId && this.isNewMode()) this.refreshNextSrNo(underOrgId);
  }

  private resolveDefaultSansthaId(lookups: OrganizationLookups | null): number | null {
    const profile = this.userProfile();
    if (profile?.orgId) {
      const sanstha = lookups?.sansthaOrgs.find((s) => s.orgID === profile.orgId);
      if (sanstha) return sanstha.orgID;
    }
    return lookups?.sansthaOrgs[0]?.orgID ?? null;
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
    this.form.update((f) => ({
      ...f,
      documents: f.documents.length > 1 ? f.documents.filter((_, i) => i !== index) : f.documents
    }));
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
      underOrgID: null,
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
