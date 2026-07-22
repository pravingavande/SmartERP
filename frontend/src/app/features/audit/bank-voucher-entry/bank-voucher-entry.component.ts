import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { OrgSchoolSelectComponent } from '../../../shared/components/org-school-select/org-school-select.component';
import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, of, switchMap } from 'rxjs';
import { AuditPrintService } from '../../../core/services/audit-print.service';
import { AuditService } from '../../../core/services/audit.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  AccountRegisterOption,
  AuditLookups,
  CASH_PAYMENT_TYPE_ID,
  Voucher,
  VoucherFormState,
  VoucherListItem
} from '../../../core/models/audit.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { validateBankVoucherForm } from '../../../core/utils/bank-voucher.util';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import { coerceEnglishNumber } from '../../../core/utils/marathi-numerals';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { todayIsoDate } from '../../../core/utils/date.util';
import { resolveDefaultSchoolOrgId } from '../../../core/utils/org-access.util';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-bank-voucher-entry',
  imports: [
    FormsModule,
    DatePipe,
    CurrencyPipe,
    LowerCasePipe,
    RouterLink,
    MarathiNumberInputDirective,
    ListActionBtnComponent,
    OrgSchoolSelectComponent
  ],
  templateUrl: './bank-voucher-entry.component.html',
  styleUrl: './bank-voucher-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BankVoucherEntryComponent {
  readonly vType = input.required<'BD' | 'BW'>();
  readonly title = input.required<string>();

  private readonly audit = inject(AuditService);
  private readonly toast = inject(ToastService);
  private readonly printService = inject(AuditPrintService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listReload$ = new Subject<void>();

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly lookups = signal<AuditLookups | null>(null);
  readonly accountRegisters = signal<AccountRegisterOption[]>([]);
  readonly narrations = signal<string[]>([]);
  readonly vouchers = signal<VoucherListItem[]>([]);
  readonly form = signal<VoucherFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly showPrintPrompt = signal(false);
  readonly pendingPrintVoucher = signal<Voucher | null>(null);
  readonly listOrgID = signal<number | null>(null);
  readonly listFyID = signal<number | null>(null);
  readonly listAccountRegisterID = signal<number | null>(null);
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isEditMode = computed(() => this.formMode() === 'edit');
  readonly isDeposit = computed(() => this.vType() === 'BD');

  readonly displayedVouchers = computed(() => {
    const regId = this.listAccountRegisterID();
    const list = this.vouchers();
    if (!regId) return list;
    return list.filter((v) => v.accountRegisterID === regId);
  });
  readonly listPageCount = computed(() =>
    Math.max(1, Math.ceil(this.displayedVouchers().length / this.listPageSize()))
  );
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
  readonly listPageEnd = computed(() =>
    Math.min(this.displayedVouchers().length, (this.listPageIndex() + 1) * this.listPageSize())
  );

  readonly bankLedgerHeads = computed(() => this.lookups()?.bankLedgerHeads ?? []);

  constructor() {
    this.audit
      .getLookups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lookups) => {
        this.lookups.set(lookups);
        this.lookupsLoading.set(false);
        const orgs = lookups?.orgs ?? [];
        const fyList = lookups?.fyList ?? [];
        const orgId = resolveDefaultSchoolOrgId(orgs, null) ?? orgs[0]?.orgID ?? null;
        const fyId = fyList[0]?.fyID ?? null;
        this.listOrgID.set(orgId);
        this.listFyID.set(fyId);
        if (orgId) {
          this.refreshLedgerLookups(orgId);
          this.loadAccountRegisters(orgId, true);
        }
        this.listReload$.next();
      });

    this.listReload$
      .pipe(
        switchMap(() => {
          const orgId = this.listOrgID();
          const fyId = this.listFyID();
          if (!orgId) return of([] as VoucherListItem[]);
          this.loading.set(true);
          return this.audit.getVouchers(orgId, this.vType(), fyId);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((items) => {
        this.vouchers.set(Array.isArray(items) ? items : []);
        this.listPageIndex.set(0);
        this.loading.set(false);
      });
  }

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listAccountRegisterID.set(null);
    this.accountRegisters.set([]);
    if (orgId) {
      this.refreshLedgerLookups(orgId);
      this.loadAccountRegisters(orgId, true);
    }
    this.listReload$.next();
  }

  /** Reload bank ledger heads from VW_LedgerHeadList_Bank for the selected school. */
  private refreshLedgerLookups(orgId: number | null): void {
    if (!orgId) return;
    this.audit
      .getLookups(orgId, this.vType())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (!data) return;
        this.lookups.update((prev) =>
          prev
            ? {
                ...prev,
                ledgerHeads: data.ledgerHeads ?? [],
                bankLedgerHeads: data.bankLedgerHeads ?? []
              }
            : data
        );
      });
  }

  onListFyChange(fyId: number | null): void {
    this.listFyID.set(fyId);
    this.listReload$.next();
  }

  onListAccountRegisterChange(regId: number | null): void {
    this.listAccountRegisterID.set(regId);
    this.listPageIndex.set(0);
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPageIndex.set(0);
  }

  goListPage(delta: number): void {
    const next = this.listPageIndex() + delta;
    if (next < 0 || next >= this.listPageCount()) return;
    this.listPageIndex.set(next);
  }

  newVoucher(): void {
    const orgId = this.listOrgID();
    if (!orgId) {
      this.toast.showError('Please select School / Organization.');
      return;
    }
    const fyId = this.listFyID() ?? this.lookups()?.fyList[0]?.fyID ?? null;
    this.formMode.set('new');
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      ...this.emptyForm(),
      orgID: orgId,
      fyID: fyId,
      accountRegisterID: this.listAccountRegisterID()
    });
    this.formVisible.set(true);
    if (this.form().accountRegisterID && fyId) {
      this.refreshNextVCode();
    } else if (orgId) {
      this.loadAccountRegisters(orgId, false);
    }
  }

  editVoucher(item: VoucherListItem): void {
    this.openVoucher(item.voucherID, 'edit');
  }

  viewVoucher(item: VoucherListItem): void {
    this.openVoucher(item.voucherID, 'view');
  }

  cancel(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  confirmDeleteVoucher(item: VoucherListItem): void {
    const label = this.isDeposit() ? 'Bank Deposit' : 'Bank Withdraw';
    if (!confirm(`Delete ${label} voucher No. ${item.vCode}?`)) return;
    this.audit.deleteVoucher(item.voucherID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result.ok) {
        this.toast.showError(result.message ?? 'Unable to delete voucher.');
        return;
      }
      this.toast.showSuccess('Voucher deleted.');
      this.listReload$.next();
    });
  }

  reprintVoucher(item: VoucherListItem): void {
    this.audit.getVoucher(item.voucherID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      if (v) this.printService.printVoucher(v);
    });
  }

  updateField<K extends keyof VoucherFormState>(key: K, value: VoucherFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
    if (key === 'accountRegisterID' || key === 'fyID') {
      this.refreshNextVCode();
    }
  }

  onLedgerHeadChange(ledgerHeadId: number | null): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'ledgerHeadId'));
    this.form.update((f) => {
      const details = [...f.details];
      details[0] = { ...details[0], ledgerHeadId, ledgerHeadNarration: '' };
      return { ...f, details };
    });
    this.narrations.set([]);
    const orgId = this.form().orgID;
    if (ledgerHeadId && orgId) {
      this.audit
        .getLedgerNarrations(orgId, ledgerHeadId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((list) => this.narrations.set(list));
    }
  }

  onNarrationChange(value: string): void {
    this.form.update((f) => {
      const details = [...f.details];
      details[0] = { ...details[0], ledgerHeadNarration: value };
      return { ...f, details };
    });
  }

  onAmountChange(value: number | string): void {
    this.fieldErrors.update((e) => removeFieldError(e, 'amount'));
    const amount = coerceEnglishNumber(value);
    this.form.update((f) => {
      const details = [...f.details];
      details[0] = { ...details[0], amount };
      return { ...f, details };
    });
  }

  save(): void {
    if (this.isViewMode()) return;
    const errors = this.validateForm();
    this.fieldErrors.set(errors);
    if (hasFieldErrors(errors)) {
      this.saveError.set('Please correct the highlighted fields.');
      return;
    }
    this.saveError.set(null);
    this.loading.set(true);
    const f = this.form();
    this.audit
      .saveVoucher(this.vType(), f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        toastOnSave(this.toast, !!saved, {
          entity: this.title(),
          mode: this.formMode(),
          errorMessage: 'Unable to save voucher.'
        });
        if (!saved) {
          this.saveError.set('Unable to save voucher.');
          return;
        }
        this.pendingPrintVoucher.set(saved);
        this.showPrintPrompt.set(true);
        this.formVisible.set(false);
        this.listReload$.next();
      });
  }

  confirmPrint(print: boolean): void {
    const voucher = this.pendingPrintVoucher();
    this.showPrintPrompt.set(false);
    this.pendingPrintVoucher.set(null);
    if (print && voucher) this.printService.printVoucher(voucher);
  }

  private openVoucher(voucherId: number, mode: FormMode): void {
    this.loading.set(true);
    this.audit.getVoucher(voucherId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      this.loading.set(false);
      if (!v) {
        this.toast.showError('Voucher not found.');
        return;
      }
      const detail = v.details[0];
      this.formMode.set(mode);
      this.fieldErrors.set({});
      this.saveError.set(null);
      this.form.set({
        voucherID: v.voucherID,
        orgID: v.orgID,
        accountRegisterID: v.accountRegisterID,
        vCode: v.vCode,
        vDate: (v.vDate ?? todayIsoDate()).toString().slice(0, 10),
        partyTID: null,
        remark: v.remark ?? '',
        paymentTypeID: CASH_PAYMENT_TYPE_ID,
        transactionNo: '',
        transactionDate: todayIsoDate(),
        depositDate: todayIsoDate(),
        ledgerHeadBankID: null,
        bankName: '',
        filePath: '',
        fyID: v.fyID,
        details: [
          {
            rowId: 1,
            srNo: 1,
            ledgerHeadId: detail?.ledgerHeadID ?? null,
            ledgerHeadNarration: detail?.ledgerHeadNarration ?? '',
            amount: detail?.amount ?? v.totalAmount ?? 0
          }
        ]
      });
      if (v.orgID) {
        this.refreshLedgerLookups(v.orgID);
        this.loadAccountRegisters(v.orgID, false);
      }
      if (detail?.ledgerHeadID && v.orgID) {
        this.audit
          .getLedgerNarrations(v.orgID, detail.ledgerHeadID)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((list) => this.narrations.set(list));
      }
      this.formVisible.set(true);
    });
  }

  private validateForm(): FieldErrors {
    return validateBankVoucherForm(this.form(), { fyList: this.lookups()?.fyList ?? [] });
  }

  private loadAccountRegisters(orgId: number, setDefault: boolean): void {
    this.audit.getAccountRegisters(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((regs) => {
      this.accountRegisters.set(regs);
      if (setDefault && !this.listAccountRegisterID() && regs.length === 1) {
        this.listAccountRegisterID.set(regs[0].accountRegisterID);
      }
      if (this.formVisible() && !this.form().accountRegisterID && regs.length) {
        const preferred =
          regs.find((r) => /bank|bank/i.test(r.accountRegister)) ??
          regs[0];
        this.updateField('accountRegisterID', preferred.accountRegisterID);
      }
    });
  }

  private refreshNextVCode(): void {
    const f = this.form();
    if (this.isEditMode() || !f.orgID || !f.accountRegisterID || !f.fyID) return;
    this.audit
      .getNextVCode(f.orgID, f.accountRegisterID, f.fyID, this.vType())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((code) => {
        if (code) this.form.update((cur) => ({ ...cur, vCode: code }));
      });
  }

  private emptyForm(): VoucherFormState {
    return {
      voucherID: null,
      orgID: null,
      accountRegisterID: null,
      vCode: 1,
      vDate: todayIsoDate(),
      partyTID: null,
      remark: '',
      paymentTypeID: CASH_PAYMENT_TYPE_ID,
      transactionNo: '',
      transactionDate: todayIsoDate(),
      depositDate: todayIsoDate(),
      ledgerHeadBankID: null,
      bankName: '',
      filePath: '',
      fyID: null,
      details: [{ rowId: 1, srNo: 1, ledgerHeadId: null, ledgerHeadNarration: '', amount: 0 }]
    };
  }
}
