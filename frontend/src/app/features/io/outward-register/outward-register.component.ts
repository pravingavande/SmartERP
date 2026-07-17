import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { IoLookups, OutwardFilter, OutwardFormState, OutwardRegisterItem } from '../../../core/models/io-register.model';
import { UserProfile } from '../../../core/models/dashboard.model';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IoRegisterService } from '../../../core/services/io-register.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrors, hasFieldErrors } from '../../../core/utils/form-field-errors';
import { pageCount, pageRange, paginateRows, sortRows, SortDirection } from '../../../core/utils/master-list.util';
import {
  IO_ALLOWED_FILE_EXT,
  IO_MAX_FILE_BYTES,
  mapIoBackendMessageToFieldErrors,
  validateOutwardForm
} from '../../../core/utils/io-register-validation.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { todayIsoDate } from '../../../core/utils/date.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-outward-register',
  imports: [FormsModule, DatePipe, CurrencyPipe, MarathiNumberInputDirective, MasterListPaginationComponent, ListActionBtnComponent],
  templateUrl: './outward-register.component.html',
  styleUrl: './outward-register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutwardRegisterComponent {
  private readonly io = inject(IoRegisterService);
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
  readonly lookups = signal<IoLookups | null>(null);
  readonly items = signal<OutwardRegisterItem[]>([]);
  readonly form = signal<OutwardFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly listOrgID = signal<number | null>(null);
  readonly filterYioID = signal<number | null>(null);
  readonly filterRecordNo = signal<number | null>(null);
  readonly filterFromDate = signal('');
  readonly filterToDate = signal('');
  readonly filterFileNo = signal('');
  readonly filterSubject = signal('');
  readonly filterAddress = signal('');
  readonly searchText = signal('');
  readonly sortKey = signal<keyof OutwardRegisterItem>('recordNo');
  readonly sortDir = signal<SortDirection>('desc');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly filteredItems = computed(() => sortRows(this.items(), this.sortKey(), this.sortDir()));
  readonly paginatedItems = computed(() => paginateRows(this.filteredItems(), this.listPageIndex(), this.listPageSize()));

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({ lookups: this.io.getLookups(), profile: this.dashboardService.getProfile() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data?.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
          return;
        }
        const orgId = this.resolveDefaultOrgId(data, profile);
        this.listOrgID.set(orgId);
        this.filterYioID.set(data.activeYear?.yioID ?? null);
        if (orgId) this.loadList();
      });
  }

  private resolveDefaultOrgId(data: IoLookups, profile: UserProfile | null): number | null {
    if (profile?.schoolCode) {
      const match = data.orgs.find((o) => o.schoolCode === profile.schoolCode);
      if (match) return match.orgID;
    }
    if (profile?.orgId) {
      const match = data.orgs.find((o) => o.orgID === profile.orgId);
      if (match) return match.orgID;
    }
    return data.orgs[0]?.orgID ?? null;
  }

  onFilterChange(): void {
    this.listPageIndex.set(0);
    this.loadList();
  }

  loadList(): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.listLoading.set(true);
    const filter: OutwardFilter = {
      orgID: orgId,
      yioID: this.filterYioID(),
      recordNo: this.filterRecordNo(),
      fromDate: this.filterFromDate() || null,
      toDate: this.filterToDate() || null,
      fileNo: this.filterFileNo() || null,
      subject: this.filterSubject() || null,
      address: this.filterAddress() || null,
      search: this.searchText() || null
    };
    this.io.getOutwardList(filter).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rows) => {
      this.listLoading.set(false);
      this.items.set(rows);
    });
  }

  newEntry(): void {
    const orgId = this.listOrgID();
    if (!orgId) {
      this.toast.showWarning('Select organization first.', 'Organization');
      return;
    }
    this.formMode.set('new');
    this.form.set({ ...this.emptyForm(), orgID: orgId, orDate: new Date().toISOString().slice(0, 10), expensesAmt: 0 });
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.formVisible.set(true);
    this.io.getOutwardNextRecordNo(orgId, this.filterYioID()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((row) => {
      if (!row) return;
      this.form.update((f) => ({ ...f, recordNo: row.nextRecordNo, yioID: row.yioID, yearName: this.lookups()?.years.find((y) => y.yioID === row.yioID)?.yearName ?? null }));
    });
  }

  editEntry(item: OutwardRegisterItem): void { this.openItem(item, 'edit'); }
  viewEntry(item: OutwardRegisterItem): void { this.openItem(item, 'view'); }

  private openItem(item: OutwardRegisterItem, mode: FormMode): void {
    this.formMode.set(mode);
    this.form.set({
      orid: item.orid,
      orgID: item.orgID,
      recordNo: item.recordNo,
      orDate: item.orDate,
      enclosures: item.enclosures ?? '',
      address: item.address,
      subject: item.subject,
      fileNo: item.fileNo ?? '',
      orrDate: item.orrDate ?? '',
      expensesAmt: item.expensesAmt,
      remark: item.remark ?? '',
      attachmentPath: item.attachmentPath ?? '',
      yioID: item.yioID,
      yearName: item.yearName ?? null
    });
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.formVisible.set(true);
  }

  deleteEntry(item: OutwardRegisterItem): void {
    if (!confirm(`Delete outward record #${item.recordNo}?`)) return;
    this.io.deleteOutward(item.orid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      if (!r.success) {
        this.toast.showError(r.message ?? 'Unable to delete outward entry.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Outward entry deleted.', 'Deleted');
      this.loadList();
    });
  }

  cancel(): void {
    this.formVisible.set(false);
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  save(): void {
    if (this.isViewMode()) return;
    const f = this.form();
    const errors = validateOutwardForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }
    this.loading.set(true);
    this.io.saveOutward(f).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        this.fieldErrors.set(mapIoBackendMessageToFieldErrors(message));
        this.saveError.set(message ?? 'Unable to save outward entry.');
        toastOnSave(this.toast, false, { entity: 'Outward entry', mode: this.formMode() === 'edit' ? 'edit' : 'new', errorMessage: message ?? 'Unable to save outward entry.' });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Outward entry', mode: this.formMode() === 'edit' ? 'edit' : 'new' });
      this.formVisible.set(false);
      this.loadList();
    });
  }

  onFileSelected(event: Event): void {
    if (this.isViewMode()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > IO_MAX_FILE_BYTES) {
      this.toast.showError('Maximum file size is 10 MB.', 'Invalid file');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!IO_ALLOWED_FILE_EXT.has(ext)) {
      this.toast.showError('Allowed file types: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX.', 'Invalid file');
      return;
    }
    const orgId = this.form().orgID ?? this.listOrgID();
    if (!orgId) {
      this.toast.showError('Please select School / Organization before uploading a file.', 'Upload failed');
      return;
    }
    this.fileUploading.set(true);
    this.io.uploadOutwardFile(file, orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ fileName, message }) => {
      this.fileUploading.set(false);
      if (!fileName) {
        this.toast.showError(message ?? 'Unable to upload file.', 'Upload failed');
        return;
      }
      this.updateForm('attachmentPath', fileName);
      this.toast.showSuccess('File uploaded.', 'Uploaded');
    });
  }

  openAttachment(fileName: string): void {
    if (!fileName?.trim()) return;
    this.io.downloadFile(this.io.outwardFileUrl(fileName)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    this.updateForm('attachmentPath', '');
  }

  exportReport(format: 'csv' | 'pdf'): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    const filter: OutwardFilter = {
      orgID: orgId,
      yioID: this.filterYioID(),
      recordNo: this.filterRecordNo(),
      fromDate: this.filterFromDate() || null,
      toDate: this.filterToDate() || null,
      fileNo: this.filterFileNo() || null,
      subject: this.filterSubject() || null,
      address: this.filterAddress() || null,
      search: this.searchText() || null
    };
    this.io.exportOutward(filter, format).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (format === 'pdf') window.open(url, '_blank');
        else {
          const a = document.createElement('a');
          a.href = url;
          a.download = 'outward-register-report.csv';
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toast.showError('Unable to export report.', 'Export failed')
    });
  }

  printReport(): void { this.exportReport('pdf'); }

  updateForm<K extends keyof OutwardFormState>(key: K, value: OutwardFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    this.fieldErrors.update((e) => {
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  formTitle(): string {
    const mode = this.formMode();
    if (mode === 'view') return 'View Outward Entry';
    if (mode === 'edit') return 'Edit Outward Entry';
    return 'New Outward Entry';
  }

  toggleSort(key: keyof OutwardRegisterItem): void {
    if (this.sortKey() === key) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  goToListPage(index: number): void { this.listPageIndex.set(index); }
  onListPageSizeChange(size: number): void { this.listPageSize.set(size); this.listPageIndex.set(0); }

  private emptyForm(): OutwardFormState {
    return {
      orid: null,
      orgID: null,
      recordNo: null,
      orDate: todayIsoDate(),
      enclosures: '',
      address: '',
      subject: '',
      fileNo: '',
      orrDate: todayIsoDate(),
      expensesAmt: 0,
      remark: '',
      attachmentPath: '',
      yioID: null,
      yearName: null
    };
  }
}
