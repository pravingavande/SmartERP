import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DonationService } from '../../../core/services/donation.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ReportPrintService } from '../../../core/services/report-print.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import {
  CASH_PAYMENT_TYPE_ID,
  Donation,
  DonationFormState,
  DonationListItem,
  DonationLookups,
  DRHeadOption,
  FyOption,
  BankLedgerHeadOption
} from '../../../core/models/donation.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import { coerceEnglishIntegerString, coerceEnglishNumber, formatAadharDisplay, filterAadharTyping, normalizeAadharDigits } from '../../../core/utils/marathi-numerals';
import { toastOnSave } from '../../../core/utils/toast-save.util';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-donation-entry',
  imports: [FormsModule, CurrencyPipe, DatePipe, MarathiNumberInputDirective, RouterLink],
  templateUrl: './donation-entry.component.html',
  styleUrl: './donation-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonationEntryComponent {
  private readonly donation = inject(DonationService);
  private readonly toast = inject(ToastService);
  private readonly reportPrint = inject(ReportPrintService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly lookups = signal<DonationLookups | null>(null);
  readonly drHeads = signal<DRHeadOption[]>([]);
  readonly donations = signal<DonationListItem[]>([]);
  readonly form = signal<DonationFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly showPrintPrompt = signal(false);
  readonly pendingPrintDonation = signal<Donation | null>(null);
  readonly listOrgID = signal<number | null>(null);
  readonly listFyID = signal<number | null>(null);
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly paginatedDonations = computed(() => {
    const list = this.donations();
    const start = this.listPageIndex() * this.listPageSize();
    return list.slice(start, start + this.listPageSize());
  });
  readonly listPageCount = computed(() => Math.max(1, Math.ceil(this.donations().length / this.listPageSize())));
  readonly listPageStart = computed(() => {
    const total = this.donations().length;
    if (!total) return 0;
    return this.listPageIndex() * this.listPageSize() + 1;
  });
  readonly listPageEnd = computed(() => {
    const total = this.donations().length;
    if (!total) return 0;
    return Math.min(total, (this.listPageIndex() + 1) * this.listPageSize());
  });
  readonly activeFy = computed(() => {
    const fyId = this.formVisible() ? (this.form().fyID ?? this.listFyID()) : this.listFyID();
    return this.lookups()?.fyList.find((fy) => fy.fyID === fyId) ?? null;
  });
  readonly receiptDateMin = computed(() => this.activeFy()?.fromDate?.slice(0, 10) ?? '');
  readonly receiptDateMax = computed(() => this.activeFy()?.toDate?.slice(0, 10) ?? '');
  readonly isCashPayment = computed(() => this.form().paymentTypeID === CASH_PAYMENT_TYPE_ID);
  readonly isChequePayment = computed(() => {
    const paymentTypeId = this.form().paymentTypeID;
    const paymentType = this.lookups()?.paymentTypes.find((pt) => pt.paymentTypeID === paymentTypeId)?.paymentType ?? '';
    return paymentType.toLowerCase().includes('cheque');
  });
  readonly showBankFields = computed(() => !this.isCashPayment());
  readonly fyDisplayName = computed(() => {
    const fyId = this.listFyID();
    return this.lookups()?.fyList.find((fy) => fy.fyID === fyId)?.fyName ?? '—';
  });

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.donation.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data?.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
          return;
        }

        const fyId = data.fyList[0]?.fyID ?? null;
        const orgId = this.resolveDefaultOrgId(data, profile);
        this.listOrgID.set(orgId);
        this.listFyID.set(fyId);
        this.form.update((f) => ({ ...f, orgID: orgId, fyID: fyId }));
        this.loadList();
      });
  }

  private resolveDefaultOrgId(data: DonationLookups, profile: UserProfile | null): number | null {
    if (profile?.schoolCode) {
      const match = data.orgs.find((o) => o.schoolCode === profile.schoolCode);
      if (match) return match.orgID;
    }
    if (profile?.orgId) {
      const match = data.orgs.find((o) => o.orgID === profile.orgId);
      if (match) return match.orgID;
    }
    return data.orgs.length === 1 ? data.orgs[0].orgID : data.orgs[0]?.orgID ?? null;
  }

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
  }

  onListFyChange(fyId: number | null): void {
    this.listFyID.set(fyId);
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPageIndex.set(0);
  }

  goToListPage(index: number): void {
    const max = this.listPageCount() - 1;
    this.listPageIndex.set(Math.max(0, Math.min(index, max)));
  }

  onOrgChange(orgId: number | null): void {
    if (this.isViewMode()) return;
    this.form.update((f) => ({ ...f, orgID: orgId, drID: null }));
    this.listOrgID.set(orgId);
    this.refreshReceiptNumbers();
  }

  refreshReceiptNumbers(): void {
    const f = this.form();
    if (!f.fyID || f.drID) return;

    const calls = [this.donation.getNextReceiptNo(f.fyID)];
    if (f.orgID) {
      calls.push(this.donation.getNextOrgReceiptNo(f.orgID, f.fyID));
    }

    forkJoin(calls)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nums) => {
        this.form.update((x) => ({
          ...x,
          receiptNo: nums[0],
          orgIDReceiptNo: nums[1] ?? x.orgIDReceiptNo
        }));
      });
  }

  loadList(): void {
    this.donation
      .getList(this.listOrgID(), this.listFyID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.donations.set(list);
        const maxPage = Math.max(0, Math.ceil(list.length / this.listPageSize()) - 1);
        if (this.listPageIndex() > maxPage) {
          this.listPageIndex.set(maxPage);
        }
      });
  }

  newEntry(): void {
    const orgId = this.listOrgID();
    const fyId = this.listFyID();
    if (!orgId || !fyId) {
      this.errorMessage.set('Select Org / School and Financial Year on the list page before adding new.');
      return;
    }
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      ...this.emptyForm(),
      orgID: orgId,
      fyID: fyId,
      receiptDate: this.clampDateToFy(new Date().toISOString().slice(0, 10), this.lookups()?.fyList.find((f) => f.fyID === fyId) ?? null) || new Date().toISOString().slice(0, 10)
    });
    this.refreshReceiptNumbers();
    this.loadDRHeads(orgId);
  }

  private loadDRHeads(orgId: number): void {
    this.donation
      .getDRHeadsForOrg(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((heads) => this.drHeads.set(heads));
  }

  editEntry(item: DonationListItem): void {
    this.loadEntry(item.drID, 'edit');
  }

  viewEntry(item: DonationListItem): void {
    this.loadEntry(item.drID, 'view');
  }

  reprintEntry(item: DonationListItem): void {
    this.printDonationRdlc(item.drID);
  }

  confirmDeleteEntry(item: DonationListItem): void {
    if (!confirm(`Delete donation receipt #${item.receiptNo}?`)) return;
    this.donation
      .delete(item.drID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) {
          this.errorMessage.set('Unable to delete donation receipt.');
          return;
        }
        this.errorMessage.set(null);
        this.loadList();
      });
  }

  private loadEntry(drId: number, mode: FormMode): void {
    this.donation
      .getById(drId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        if (!d) return;
        this.formMode.set(mode);
        this.formVisible.set(true);
        this.applyDonationToForm(d);
        this.listOrgID.set(d.orgID ?? null);
        this.listFyID.set(d.fyID ?? null);
        if (d.orgID) this.loadDRHeads(d.orgID);
      });
  }

  private applyDonationToForm(d: Donation): void {
    this.form.set({
      drID: d.drID,
      receiptNo: d.receiptNo ?? 1,
      orgIDReceiptNo: d.orgIDReceiptNo ?? 1,
      receiptDate: d.receiptDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      drHeadID: d.drHeadID ?? null,
      donorName: d.donorName ?? '',
      address: d.address ?? '',
      panNo: d.panNo ?? '',
      aadharNo: formatAadharDisplay(d.aadharNo ?? ''),
      mobileNo: d.mobileNo ?? '',
      amount: d.amount ?? 0,
      paymentTypeID: d.paymentTypeID ?? CASH_PAYMENT_TYPE_ID,
      transactionNo: d.transactionNo ?? '',
      transactionDate: d.transactionDate?.slice(0, 10) ?? '',
      depositDate: d.depositDate ? d.depositDate.slice(0, 10) : '',
      bankName: d.bankName ?? '',
      ledgerHeadBankID: d.ledgerHeadBankID ?? null,
      remark: d.remark ?? '',
      fyID: d.fyID ?? null,
      orgID: d.orgID ?? null
    });
  }

  save(): void {
    if (this.isViewMode()) return;
    this.normalizeNumericFields();
    const errors = this.validateForm();
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.donation
      .save(this.form())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('Unable to save donation entry.');
          toastOnSave(this.toast, false, { entity: 'Donation entry', mode: this.formMode(), errorMessage: 'Unable to save donation entry.' });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Donation entry', mode: this.formMode() });
        this.loadList();
        this.pendingPrintDonation.set(saved);
        this.showPrintPrompt.set(true);
      });
  }

  private normalizeNumericFields(): void {
    this.form.update((f) => ({
      ...f,
      mobileNo: coerceEnglishIntegerString(f.mobileNo, 10),
      aadharNo: normalizeAadharDigits(f.aadharNo),
      amount: coerceEnglishNumber(f.amount)
    }));
  }

  private validateForm(): FieldErrors {
    const f = this.form();
    const errors: FieldErrors = {};

    const receiptDate = f.receiptDate?.trim();
    if (!receiptDate) {
      errors['receiptDate'] = 'Please enter Receipt Date.';
    } else if (!this.isDateWithinFy(receiptDate)) {
      errors['receiptDate'] = 'Receipt Date must be within the selected Financial Year.';
    }

    if (!f.drHeadID) {
      errors['drHeadID'] = 'Please select Donation Head.';
    }
    if (!f.donorName.trim()) {
      errors['donorName'] = 'Please enter Donor Name.';
    }
    if (f.amount <= 0) {
      errors['amount'] = 'Please enter Amount.';
    }
    if (!f.paymentTypeID) {
      errors['paymentTypeID'] = 'Please select Payment Type.';
    }

    const mobile = f.mobileNo.trim();
    if (mobile && !/^\d{10}$/.test(mobile)) {
      errors['mobileNo'] = 'Please enter a valid 10-digit Mobile Number.';
    }

    const aadhar = normalizeAadharDigits(f.aadharNo);
    if (aadhar && !/^\d{12}$|^\d{14}$/.test(aadhar)) {
      errors['aadharNo'] = 'Please enter a valid Aadhaar Number (12 or 14 digits).';
    }

    if (this.isChequePayment()) {
      if (!f.bankName?.trim()) {
        errors['bankName'] = 'Please enter Bank Name.';
      }
      if (!f.transactionNo?.trim()) {
        errors['transactionNo'] = 'Please enter Transaction/UTR/Cheque No.';
      }
      if (!f.ledgerHeadBankID) {
        errors['ledgerHeadBankID'] = 'Please select Deposit Bank.';
      }
      if (!f.transactionDate?.trim()) {
        errors['transactionDate'] = 'Please enter Transaction/UTR/Cheque Date.';
      }
      if (!f.depositDate?.trim()) {
        errors['depositDate'] = 'Please enter Deposit Date.';
      }
    }

    return errors;
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  confirmPrint(): void {
    const d = this.pendingPrintDonation();
    if (d?.drID) this.printDonationRdlc(d.drID);
    this.dismissPrintPrompt();
  }

  dismissPrintPrompt(): void {
    this.showPrintPrompt.set(false);
    this.pendingPrintDonation.set(null);
    this.closeForm();
  }

  printCurrent(): void {
    const id = this.form().drID;
    if (!id) return;
    this.printDonationRdlc(id);
  }

  private printDonationRdlc(drId: number): void {
    this.donation
      .downloadReceiptPdf(drId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((blob) => {
        if (!blob) {
          this.toast.showError('Unable to generate donation receipt PDF.', 'Print failed');
          return;
        }
        this.reportPrint.openPdf(blob, 'Donation Receipt');
      });
  }

  cancel(): void {
    this.closeForm();
    this.errorMessage.set(null);
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.loadList();
  }

  updateForm<K extends keyof DonationFormState>(key: K, value: DonationFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((x) => ({ ...x, [key]: value }));
  }

  onAadharChange(value: string): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'aadharNo'));
    this.updateForm('aadharNo', filterAadharTyping(value));
  }

  onReceiptDateChange(value: string): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'receiptDate'));
    this.updateForm('receiptDate', this.clampDateToFy(value, this.activeFy()));
  }

  bankLedgerHeads(): BankLedgerHeadOption[] {
    return this.lookups()?.bankLedgerHeads ?? [];
  }

  private isDateWithinFy(date: string): boolean {
    const fy = this.activeFy();
    if (!fy || !date) return true;
    return date >= fy.fromDate.slice(0, 10) && date <= fy.toDate.slice(0, 10);
  }

  private clampDateToFy(date: string, fy: FyOption | null): string {
    if (!fy || !date) return date;
    const min = fy.fromDate.slice(0, 10);
    const max = fy.toDate.slice(0, 10);
    if (date < min) return min;
    if (date > max) return max;
    return date;
  }

  private emptyForm(): DonationFormState {
    return {
      drID: null,
      receiptNo: 1,
      orgIDReceiptNo: 1,
      receiptDate: new Date().toISOString().slice(0, 10),
      drHeadID: null,
      donorName: '',
      address: '',
      panNo: '',
      aadharNo: '',
      mobileNo: '',
      amount: 0,
      paymentTypeID: CASH_PAYMENT_TYPE_ID,
      transactionNo: '',
      transactionDate: '',
      depositDate: '',
      bankName: '',
      ledgerHeadBankID: null,
      remark: '',
      fyID: null,
      orgID: null
    };
  }
}
