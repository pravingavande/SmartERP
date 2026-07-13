import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of, Subject, switchMap } from 'rxjs';
import { AuditPrintService } from '../../../core/services/audit-print.service';
import { AuditService } from '../../../core/services/audit.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import {
  AccountRegisterOption,
  AuditLookups,
  CASH_PAYMENT_TYPE_ID,
  FyOption,
  LedgerHeadOption,
  PartyOption,
  Voucher,
  VoucherFormState,
  VoucherListItem
} from '../../../core/models/audit.model';
import {
  FieldErrors,
  detailFieldKey,
  hasFieldErrors,
  removeFieldError
} from '../../../core/utils/form-field-errors';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import { coerceEnglishIntegerString, coerceEnglishNumber } from '../../../core/utils/marathi-numerals';
import { toastOnSave } from '../../../core/utils/toast-save.util';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-voucher-entry',
  imports: [FormsModule, DatePipe, CurrencyPipe, RouterLink, MarathiNumberInputDirective],
  templateUrl: './voucher-entry.component.html',
  styleUrl: './voucher-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoucherEntryComponent {
  private static readonly MAX_NARRATION_CACHE = 25;

  readonly vType = input.required<'R' | 'P'>();
  readonly title = input.required<string>();

  private readonly audit = inject(AuditService);
  private readonly toast = inject(ToastService);
  private readonly printService = inject(AuditPrintService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listReload$ = new Subject<void>();

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly lookups = signal<AuditLookups | null>(null);
  readonly accountRegisters = signal<AccountRegisterOption[]>([]);
  readonly parties = signal<PartyOption[]>([]);
  readonly narrations = signal<Record<number, string[]>>({});
  readonly vouchers = signal<VoucherListItem[]>([]);
  readonly form = signal<VoucherFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly showPrintPrompt = signal(false);
  readonly pendingPrintVoucher = signal<Voucher | null>(null);
  readonly listOrgID = signal<number | null>(null);
  readonly listFyID = signal<number | null>(null);
  readonly listAccountRegisterID = signal<number | null>(null);
  readonly showPartyModal = signal(false);
  readonly partySaving = signal(false);
  readonly partyForm = signal({ partyName: '', mobNo: '', address: '' });
  readonly partyFieldErrors = signal<FieldErrors>({});
  readonly selectedFileName = signal<string | null>(null);
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  private detailRowSeq = 0;

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isEditMode = computed(() => this.formMode() === 'edit');
  readonly isCashPayment = computed(() => this.form().paymentTypeID === CASH_PAYMENT_TYPE_ID);
  readonly isChequePayment = computed(() => {
    const paymentTypeId = this.form().paymentTypeID;
    const paymentType = this.lookups()?.paymentTypes.find((pt) => pt.paymentTypeID === paymentTypeId)?.paymentType ?? '';
    return paymentType.toLowerCase().includes('cheque');
  });
  readonly totalAmount = computed(() =>
    this.form().details.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  );
  readonly showBankFields = computed(() => !this.isCashPayment());
  readonly isPaymentVoucher = computed(() => this.vType() === 'P');
  readonly isReceiptVoucher = computed(() => this.vType() === 'R');
  readonly displayedVouchers = computed(() => {
    const regId = this.listAccountRegisterID();
    const list = this.vouchers();
    if (!regId) return list;
    return list.filter((v) => v.accountRegisterID === regId);
  });
  readonly listPageCount = computed(() => {
    const total = this.displayedVouchers().length;
    return Math.max(1, Math.ceil(total / this.listPageSize()));
  });
  readonly paginatedVouchers = computed(() => {
    const list = this.displayedVouchers();
    const start = this.listPageIndex() * this.listPageSize();
    return list.slice(start, start + this.listPageSize());
  });
  readonly listPageStart = computed(() => {
    const total = this.displayedVouchers().length;
    if (!total) return 0;
    return this.listPageIndex() * this.listPageSize() + 1;
  });
  readonly listPageEnd = computed(() => {
    const total = this.displayedVouchers().length;
    if (!total) return 0;
    return Math.min(total, (this.listPageIndex() + 1) * this.listPageSize());
  });
  readonly partyFieldLocked = computed(() => this.isViewMode());
  readonly activeFy = computed(() => {
    const fyId = this.formVisible() ? (this.form().fyID ?? this.listFyID()) : this.listFyID();
    return this.lookups()?.fyList.find((fy) => fy.fyID === fyId) ?? null;
  });
  readonly fyDisplayName = computed(() => this.activeFy()?.fyName ?? '—');
  readonly voucherDateMin = computed(() => this.activeFy()?.fromDate.slice(0, 10) ?? '');
  readonly voucherDateMax = computed(() => this.activeFy()?.toDate.slice(0, 10) ?? '');

  constructor() {
    this.listReload$
      .pipe(
        switchMap(() => {
          const orgId = this.listOrgID();
          if (!orgId) return of([] as VoucherListItem[]);
          return this.audit.getVouchers(orgId, this.vType(), this.listFyID());
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.vouchers.set(list);
        const maxPage = Math.max(0, Math.ceil(list.length / this.listPageSize()) - 1);
        if (this.listPageIndex() > maxPage) {
          this.listPageIndex.set(maxPage);
        }
      });

    this.destroyRef.onDestroy(() => this.listReload$.complete());
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.audit.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data?.orgs?.length) {
          this.errorMessage.set('No schools found for your login. Contact admin to map org access.');
          return;
        }

        const activeFy = data.fyList[0] ?? null;
        const orgId = this.resolveDefaultOrgId(data, profile);
        const fyId = activeFy?.fyID ?? null;

        this.listOrgID.set(orgId);
        this.listFyID.set(fyId);
        this.form.update((f) => ({ ...f, orgID: orgId, fyID: fyId }));

        if (orgId) {
          this.loadOrgDependents(orgId, false);
        }
      });
  }

  private resolveDefaultOrgId(data: AuditLookups, profile: UserProfile | null): number | null {
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
    this.listAccountRegisterID.set(null);
    this.form.update((f) => ({ ...f, orgID: orgId }));
    if (!orgId) {
      this.accountRegisters.set([]);
      this.parties.set([]);
      this.vouchers.set([]);
      return;
    }
    this.closeForm();
    this.loadOrgDependents(orgId, true);
  }

  onListFyChange(fyId: number | null): void {
    this.listFyID.set(fyId);
    this.listPageIndex.set(0);
    this.form.update((f) => ({ ...f, fyID: fyId }));
    this.closeForm();
    this.loadVoucherList();
  }

  onListAccountRegisterChange(accountRegisterId: number | null): void {
    this.listAccountRegisterID.set(accountRegisterId);
    this.listPageIndex.set(0);
    this.closeForm();
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
    this.formMode.set('new');
    this.form.update((f) => ({
      ...f,
      orgID: orgId,
      accountRegisterID: null,
      partyTID: null,
      voucherID: null,
      vCode: 1
    }));
    this.listOrgID.set(orgId);
    if (!orgId) {
      this.accountRegisters.set([]);
      this.parties.set([]);
      return;
    }
    this.loadOrgDependents(orgId, false);
  }

  private loadOrgDependents(orgId: number, reloadListOnly: boolean): void {
    this.audit.getAccountRegisters(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      this.accountRegisters.set(r);
      if (r.length) {
        this.errorMessage.set(null);
      } else if (this.formVisible()) {
        this.errorMessage.set('No account register mapped for this school. Configure under Account Register Define.');
      }
    });
    this.loadParties(orgId, this.form().partyTID);
    if (reloadListOnly || !this.formVisible()) {
      this.loadVoucherList();
    }
  }

  onAccountRegisterChange(): void {
    const f = this.form();
    if (f.orgID && f.accountRegisterID && f.fyID && !f.voucherID) {
      this.audit
        .getNextVCode(f.orgID, f.accountRegisterID, f.fyID, this.vType())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((code) => this.form.update((x) => ({ ...x, vCode: code })));
    }
  }

  loadVoucherList(): void {
    if (!this.listOrgID()) return;
    this.listReload$.next();
  }

  loadNarrations(ledgerHeadId: number | null): void {
    if (!ledgerHeadId) return;
    if (this.narrations()[ledgerHeadId]) return;
    this.audit
      .getLedgerNarrations(ledgerHeadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.narrations.update((n) => {
          const next = { ...n, [ledgerHeadId]: list };
          const ids = Object.keys(next).map(Number);
          if (ids.length <= VoucherEntryComponent.MAX_NARRATION_CACHE) return next;
          for (const id of ids.slice(0, ids.length - VoucherEntryComponent.MAX_NARRATION_CACHE)) {
            delete next[id];
          }
          return next;
        });
      });
  }

  addDetailRow(): void {
    if (this.isViewMode()) return;
    this.form.update((f) => ({
      ...f,
      details: [...f.details, this.createDetailLine(f.details.length + 1)]
    }));
  }

  confirmRemoveDetailRow(index: number): void {
    if (this.isViewMode() || this.form().details.length <= 1) return;
    if (!confirm('Remove this voucher detail row?')) return;
    this.removeDetailRow(index);
  }

  removeDetailRow(index: number): void {
    if (this.isViewMode()) return;
    this.form.update((f) => {
      if (f.details.length <= 1) return f;
      const details = f.details.filter((_, i) => i !== index).map((d, i) => ({ ...d, srNo: i + 1 }));
      return { ...f, details };
    });
  }

  newVoucher(): void {
    const orgId = this.listOrgID();
    const fyId = this.listFyID();
    if (!orgId || !fyId) {
      this.errorMessage.set('Select Org / School and Financial Year on the list page before adding new.');
      return;
    }
    const fy = this.activeFy();
    const today = this.todayDateString();
    this.detailRowSeq = 0;
    this.selectedFileName.set(null);
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      ...this.emptyForm(),
      orgID: orgId,
      fyID: fyId,
      accountRegisterID: this.listAccountRegisterID(),
      vDate: this.clampDateToFy(today, fy) || today
    });
    this.loadOrgDependents(orgId, false);
    if (this.listAccountRegisterID()) {
      this.onAccountRegisterChange();
    }
  }

  editVoucher(item: VoucherListItem): void {
    this.loadVoucher(item.voucherID, 'edit');
  }

  viewVoucher(item: VoucherListItem): void {
    this.loadVoucher(item.voucherID, 'view');
  }

  reprintVoucher(item: VoucherListItem): void {
    this.audit
      .getVoucher(item.voucherID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (v) this.printService.printVoucher(v);
      });
  }

  confirmDeleteVoucher(item: VoucherListItem): void {
    if (!confirm(`Delete ${this.isReceiptVoucher() ? 'receipt' : 'payment'} voucher #${item.vCode}?`)) return;
    this.audit
      .deleteVoucher(item.voucherID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) {
          this.errorMessage.set('Unable to delete voucher.');
          return;
        }
        this.errorMessage.set(null);
        this.loadVoucherList();
      });
  }

  private loadVoucher(voucherId: number, mode: FormMode): void {
    this.audit
      .getVoucher(voucherId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (!v) return;
        this.formMode.set(mode);
        this.formVisible.set(true);
        this.applyVoucherToForm(v);
        this.listOrgID.set(v.orgID);
        this.listFyID.set(v.fyID);
        this.audit.getAccountRegisters(v.orgID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => this.accountRegisters.set(r));
        this.loadParties(v.orgID, v.partyTID ?? null);
        v.details.forEach((d) => this.loadNarrations(d.ledgerHeadID));
      });
  }

  private applyVoucherToForm(v: Voucher): void {
    this.detailRowSeq = 0;
    this.selectedFileName.set(v.filePath ?? null);
    this.form.set({
      voucherID: v.voucherID,
      orgID: v.orgID,
      accountRegisterID: v.accountRegisterID,
      vCode: v.vCode,
      vDate: v.vDate.slice(0, 10),
      partyTID: v.partyTID ?? null,
      remark: v.remark ?? '',
      paymentTypeID: v.paymentTypeID ?? CASH_PAYMENT_TYPE_ID,
      transactionNo: v.transactionNo ?? '',
      transactionDate: v.transactionDate?.slice(0, 10) ?? '',
      depositDate: v.depositDate ? v.depositDate.slice(0, 10) : '',
      ledgerHeadBankID: v.ledgerHeadBankID ?? null,
      bankName: v.bankName ?? '',
      filePath: v.filePath ?? '',
      fyID: v.fyID,
      details: v.details.length
        ? v.details.map((d) => this.createDetailLine(d.srNo, d.ledgerHeadID, d.ledgerHeadNarration ?? '', d.amount))
        : [this.createDetailLine(1)]
    });
  }

  save(): void {
    if (this.isViewMode()) return;
    this.normalizeNumericFields();
    const validationError = this.validateForm();
    if (hasFieldErrors(validationError)) {
      this.fieldErrors.set(validationError);
      this.saveError.set(null);
      return;
    }

    const f = this.form();
    const vDate = f.vDate?.trim() || this.clampDateToFy(this.todayDateString(), this.activeFy()) || this.todayDateString();
    if (!f.vDate?.trim()) {
      this.updateForm('vDate', vDate);
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.audit
      .saveVoucher(this.vType(), { ...f, vDate })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('Unable to save voucher. Please check all required fields and try again.');
          toastOnSave(this.toast, false, { entity: 'Voucher', mode: this.formMode(), errorMessage: 'Unable to save voucher. Please check all required fields and try again.' });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Voucher', mode: this.formMode() });
        this.loadVoucherList();
        this.pendingPrintVoucher.set(saved);
        this.showPrintPrompt.set(true);
      });
  }

  private normalizeNumericFields(): void {
    this.form.update((f) => ({
      ...f,
      details: f.details.map((d) => ({
        ...d,
        amount: coerceEnglishNumber(d.amount)
      }))
    }));
  }

  private validateForm(): FieldErrors {
    const f = this.form();
    const errors: FieldErrors = {};

    if (!f.accountRegisterID) {
      errors['accountRegisterID'] = 'Please select Account Register.';
    }

    const vDate = f.vDate?.trim() || this.todayDateString();
    if (!vDate) {
      errors['vDate'] = 'Please enter Voucher Date.';
    } else if (!this.isDateWithinFy(vDate)) {
      errors['vDate'] = 'Voucher Date must be within the selected Financial Year.';
    }

    if (!f.partyTID) {
      errors['partyTID'] = 'Please select Party Name.';
    }

    if (!f.paymentTypeID) {
      errors['paymentTypeID'] = 'Please select Payment Type.';
    }

    if (f.details.length < 1) {
      errors['details'] = 'Please add at least one voucher detail row.';
    }

    for (let i = 0; i < f.details.length; i++) {
      const line = f.details[i];
      if (!line.ledgerHeadId) {
        errors[detailFieldKey(i, 'ledgerHeadId')] = 'Please select Ledger Head.';
      }
      if (!line.amount || line.amount <= 0) {
        errors[detailFieldKey(i, 'amount')] = 'Please enter Amount.';
      }
    }

    if (this.totalAmount() <= 0) {
      errors['detailsTotal'] = 'Please enter Amount.';
    }

    if (this.isChequePayment()) {
      if (!f.bankName?.trim()) {
        errors['bankName'] = 'Please enter Bank Name.';
      }
      if (!f.ledgerHeadBankID) {
        errors['ledgerHeadBankID'] = 'Please select Deposit Bank.';
      }
      if (!f.transactionNo?.trim()) {
        errors['transactionNo'] = 'Please enter Transaction/UTR/Cheque No.';
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

  detailFieldError(index: number, field: string): string | null {
    return this.fieldError(detailFieldKey(index, field));
  }

  confirmPrint(): void {
    const v = this.pendingPrintVoucher();
    if (v) this.printService.printVoucher(v);
    this.dismissPrintPrompt();
  }

  dismissPrintPrompt(): void {
    this.showPrintPrompt.set(false);
    this.pendingPrintVoucher.set(null);
    this.closeForm();
  }

  printCurrent(): void {
    const id = this.form().voucherID;
    if (!id) return;
    this.audit
      .getVoucher(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (v) this.printService.printVoucher(v);
      });
  }

  cancel(): void {
    this.closeForm();
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  closeForm(): void {
    this.selectedFileName.set(null);
    this.formVisible.set(false);
    this.formMode.set('new');
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.narrations.set({});
    this.loadVoucherList();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFileName.set(file.name);
    this.updateForm('filePath', file.name);
  }

  onVoucherDateChange(value: string): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'vDate'));
    this.updateForm('vDate', this.clampDateToFy(value, this.activeFy()));
  }

  updateForm<K extends keyof VoucherFormState>(key: K, value: VoucherFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  updateDetail(index: number, field: keyof VoucherFormState['details'][0], value: unknown): void {
    this.fieldErrors.update((e) => removeFieldError(e, detailFieldKey(index, String(field))));
    if (field === 'amount') {
      this.fieldErrors.update((e) => removeFieldError(e, 'detailsTotal'));
    }
    this.form.update((f) => {
      const details = [...f.details];
      details[index] = { ...details[index], [field]: value };
      return { ...f, details };
    });
  }

  ledgerHeads(): LedgerHeadOption[] {
    const heads = this.lookups()?.ledgerHeads ?? [];
    if (!this.isReceiptVoucher()) return heads;
    return heads.filter((h) => h.ledgerTypeID === 2 || h.ledgerTypeID === 4);
  }

  bankLedgerHeads(): LedgerHeadOption[] {
    const heads = this.lookups()?.ledgerHeads ?? [];
    const filtered = heads.filter((h) => [5, 6, 7, 8, 9].includes(h.ledgerTypeID ?? 0));
    if (filtered.length) return filtered;
    return this.lookups()?.bankLedgerHeads ?? [];
  }

  openPartyModal(): void {
    if (this.partyFieldLocked() || !this.form().orgID) return;
    this.partyForm.set({ partyName: '', mobNo: '', address: '' });
    this.showPartyModal.set(true);
  }

  closePartyModal(): void {
    this.showPartyModal.set(false);
  }

  saveQuickParty(): void {
    const orgId = this.form().orgID;
    const pf = this.partyForm();
    if (!orgId || !pf.partyName.trim()) {
      this.partyFieldErrors.set({ partyName: 'Party name is required.' });
      return;
    }
    this.partyFieldErrors.set({});
    this.partySaving.set(true);
    this.audit
      .saveParty({
        partyID: null,
        orgID: orgId,
        partyName: pf.partyName.trim(),
        address: pf.address,
        mobNo: coerceEnglishIntegerString(pf.mobNo, 10),
        panNo: '',
        gstNo: '',
        isActive: true
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data: saved, message }) => {
        this.partySaving.set(false);
        if (!saved?.partyID) {
          this.saveError.set(message ?? 'Unable to save party.');
          toastOnSave(this.toast, false, { entity: 'Party', mode: 'new', errorMessage: message ?? 'Unable to save party.' });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Party', mode: 'new' });
        const newParty: PartyOption = {
          partyID: saved.partyID,
          partyName: saved.partyName,
          mobNo: saved.mobNo ?? null
        };
        this.parties.update((list) => {
          if (list.some((p) => p.partyID === newParty.partyID)) return list;
          return [...list, newParty].sort((a, b) => a.partyName.localeCompare(b.partyName));
        });
        this.form.update((f) => ({ ...f, partyTID: saved.partyID }));
        this.loadParties(orgId, saved.partyID, () => {
          this.form.update((f) => ({ ...f, partyTID: saved.partyID }));
            this.closePartyModal();
            this.errorMessage.set(null);
          });
      });
  }

  partyFieldError(key: string): string | null {
    return this.partyFieldErrors()[key] ?? null;
  }

  private loadParties(orgId: number, selectedPartyId?: number | null, onLoaded?: () => void): void {
    this.audit
      .getParties(orgId, selectedPartyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((parties) => {
        this.parties.set(parties);
        onLoaded?.();
      });
  }

  updatePartyForm(field: 'partyName' | 'mobNo' | 'address', value: string): void {
    this.partyFieldErrors.update((e) => removeFieldError(e, field));
    this.partyForm.update((p) => ({ ...p, [field]: value }));
  }

  narrationList(ledgerHeadId: number | null): string[] {
    return ledgerHeadId ? this.narrations()[ledgerHeadId] ?? [] : [];
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

  private todayDateString(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private createDetailLine(
    srNo: number,
    ledgerHeadId: number | null = null,
    ledgerHeadNarration = '',
    amount = 0
  ): VoucherFormState['details'][0] {
    return {
      rowId: ++this.detailRowSeq,
      srNo,
      ledgerHeadId,
      ledgerHeadNarration,
      amount
    };
  }

  private emptyForm(): VoucherFormState {
    this.detailRowSeq = 0;
    return {
      voucherID: null,
      orgID: null,
      accountRegisterID: null,
      vCode: 1,
      vDate: this.todayDateString(),
      partyTID: null,
      remark: '',
      paymentTypeID: CASH_PAYMENT_TYPE_ID,
      transactionNo: '',
      transactionDate: '',
      depositDate: '',
      ledgerHeadBankID: null,
      bankName: '',
      filePath: '',
      fyID: null,
      details: [this.createDetailLine(1)]
    };
  }
}
