import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditLookups } from '../../../core/models/audit.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { DocumentUploadFormState, DocumentUploadItem } from '../../../core/models/document-upload.model';
import { AuditService } from '../../../core/services/audit.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DocumentUploadService } from '../../../core/services/document-upload.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import { mapBackendMessageToFieldErrors, validateDocumentUploadForm } from '../../../core/utils/master-validation.util';
import { resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

const ALLOWED_FILE_EXT = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-document-upload-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent, OrgSchoolSelectComponent],
  templateUrl: './document-upload-master.component.html',
  styleUrl: './document-upload-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentUploadMasterComponent {
  private readonly documentUpload = inject(DocumentUploadService);
  private readonly audit = inject(AuditService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly fileUploading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<AuditLookups | null>(null);
  readonly items = signal<DocumentUploadItem[]>([]);
  readonly form = signal<DocumentUploadFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly selectedFileName = signal('');
  readonly listOrgID = signal<number | null>(null);
  readonly searchText = signal('');
  readonly sortKey = signal<keyof DocumentUploadItem>('srNo');
  readonly sortDir = signal<SortDirection>('asc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly schoolOrgs = computed(() => this.lookups()?.orgs ?? []);
  readonly selectedOrgName = computed(() => {
    const orgId = this.listOrgID();
    return this.schoolOrgs().find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });
  readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    let rows = this.items();
    if (q) {
      rows = rows.filter((x) => x.documentTitle.toLowerCase().includes(q));
    }
    return sortRows(rows, this.sortKey(), this.sortDir());
  });
  readonly listPageCount = computed(() => pageCount(this.filteredItems().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.filteredItems(), this.listPageIndex(), this.listPageSize()));
  readonly isEditMode = computed(() => this.formMode() === 'edit');

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.audit.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lookups: data, profile }) => {
          this.lookupsLoading.set(false);
          this.lookups.set(data);
          if (!data?.orgs?.length) {
            this.errorMessage.set('No schools found for your login.');
            return;
          }
          this.listOrgID.set(resolveDefaultSchoolOrgId(data.orgs, profile as UserProfile));
          this.loadList();
        },
        error: () => {
          this.lookupsLoading.set(false);
          this.errorMessage.set('Unable to load organization list.');
        }
      });
  }

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listPageIndex.set(0);
    this.closeForm();
    if (orgId) this.loadList();
    else this.items.set([]);
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.listPageIndex.set(0);
  }

  onSrNoChange(value: number | string | null): void {
    this.updateForm('srNo', value === '' || value == null ? null : +value);
  }

  loadList(): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.listLoading.set(true);
    this.documentUpload
      .getList(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.listLoading.set(false);
        this.items.set(list);
        this.listPageIndex.set(0);
      });
  }

  toggleSort(key: keyof DocumentUploadItem): void {
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
    const orgId = this.listOrgID();
    if (!orgId) {
      this.errorMessage.set('Select School / Organization before adding.');
      return;
    }
    this.formMode.set('new');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.selectedFileName.set('');
    const today = new Date().toISOString().slice(0, 10);
    this.form.set({ ...this.emptyForm(), orgID: orgId, tDate: today });
    this.loadNextSrNo(orgId);
  }

  editItem(item: DocumentUploadItem): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.selectedFileName.set(this.displayFileName(item.documentPath));
    this.form.set({
      documentUploadID: item.documentUploadID,
      orgID: item.orgID,
      srNo: item.srNo,
      tDate: item.tDate,
      documentTitle: item.documentTitle,
      documentPath: item.documentPath ?? ''
    });
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.selectedFileName.set('');
  }

  cancel(): void {
    this.closeForm();
  }

  updateForm<K extends keyof DocumentUploadFormState>(key: K, value: DocumentUploadFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    this.fieldErrors.update((errs) => removeFieldError(errs, String(key)));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      this.toast.showError('Maximum file size is 5 MB.', 'Invalid file');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_FILE_EXT.has(ext)) {
      this.toast.showError('Allowed file types: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG.', 'Invalid file');
      return;
    }

    const orgId = this.form().orgID ?? this.listOrgID();
    if (!orgId) {
      this.toast.showError('Please select School / Organization before uploading.', 'Upload failed');
      return;
    }

    this.fileUploading.set(true);
    this.documentUpload
      .upload(file, orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ path, message }) => {
        this.fileUploading.set(false);
        if (!path) {
          this.toast.showError(message ?? 'Unable to upload file.', 'Upload failed');
          return;
        }
        this.updateForm('documentPath', path);
        this.selectedFileName.set(file.name);
        this.toast.showSuccess('File uploaded.', 'Uploaded');
      });
  }

  save(): void {
    const current = this.form();
    const errors = validateDocumentUploadForm(current, this.isEditMode());
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }

    this.loading.set(true);
    this.documentUpload
      .save(current)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.loading.set(false);
        toastOnSave(this.toast, !!data, {
          entity: 'Document',
          mode: this.formMode(),
          errorMessage: message ?? 'Unable to save document.'
        });
        if (!data) {
          this.saveError.set(message ?? 'Unable to save document.');
          this.fieldErrors.set(mapBackendMessageToFieldErrors(message ?? ''));
          return;
        }
        this.closeForm();
        this.loadList();
      });
  }

  deleteItem(item: DocumentUploadItem): void {
    if (!confirm(`Delete document "${item.documentTitle}"?`)) return;
    this.documentUpload
      .delete(item.documentUploadID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ success, message }) => {
        if (!success) {
          this.toast.showError(message ?? 'Unable to delete document.', 'Delete failed');
          return;
        }
        this.toast.showSuccess('Document deleted.', 'Deleted');
        this.loadList();
      });
  }

  viewDocument(path: string | null | undefined): void {
    if (!path?.trim()) return;
    const url = this.documentUpload.fileUrl(path);
    this.documentUpload
      .downloadFile(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          window.open(objectUrl, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: () => this.toast.showError('Unable to open document.', 'View failed')
      });
  }

  downloadDocument(path: string | null | undefined, title: string): void {
    if (!path?.trim()) return;
    const url = this.documentUpload.fileUrl(path);
    this.documentUpload
      .downloadFile(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = this.displayFileName(path) || `${title}.file`;
          anchor.click();
          URL.revokeObjectURL(objectUrl);
        },
        error: () => this.toast.showError('Unable to download document.', 'Download failed')
      });
  }

  displayFileName(path: string | null | undefined): string {
    if (!path?.trim()) return '';
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] ?? path;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  private loadNextSrNo(orgId: number): void {
    this.documentUpload
      .getNextSrNo(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((next) => this.updateForm('srNo', next));
  }

  private emptyForm(): DocumentUploadFormState {
    return {
      documentUploadID: null,
      orgID: null,
      srNo: null,
      tDate: '',
      documentTitle: '',
      documentPath: ''
    };
  }
}
