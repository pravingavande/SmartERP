import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuditPrintService } from '../../../core/services/audit-print.service';
import { AuditService } from '../../../core/services/audit.service';
import {
  AccountRegisterOption,
  AuditLookups,
  CASH_PAYMENT_TYPE_ID,
  LedgerHeadOption,
  PartyOption,
  Voucher,
  VoucherFormState,
  VoucherListItem
} from '../../../core/models/audit.model';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-voucher-entry',
  imports: [FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './voucher-entry.component.html',
  styleUrl: './voucher-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoucherEntryComponent {
  readonly vType = input.required<'R' | 'P'>();
  readonly title = input.required<string>();

  private readonly audit = inject(AuditService);
  private readonly printService = inject(AuditPrintService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly lookups = signal<AuditLookups | null>(null);
  readonly accountRegisters = signal<AccountRegisterOption[]>([]);
  readonly parties = signal<PartyOption[]>([]);
  readonly narrations = signal<Record<number, string[]>>({});
  readonly vouchers = signal<VoucherListItem[]>([]);
  readonly form = signal<VoucherFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly showPrintPrompt = signal(false);
  readonly pendingPrintVoucher = signal<Voucher | null>(null);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isCashPayment = computed(() => this.form().paymentTypeID === CASH_PAYMENT_TYPE_ID);
  readonly totalAmount = computed(() =>
    this.form().details.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  );
  readonly showBankFields = computed(() => !this.isCashPayment());

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.audit
      .getLookups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data?.orgs?.length) {
          this.errorMessage.set('No schools found for your login. Contact admin to map org access.');
        }
        if (data?.fyList.length) {
          const activeFy = data.fyList[0];
          this.form.update((f) => ({ ...f, fyID: activeFy.fyID }));
        }
        if (data?.orgs.length === 1) {
          this.onOrgChange(data.orgs[0].orgID);
        }
      });
  }

  onOrgChange(orgId: number | null): void {
    this.formMode.set('new');
    this.form.update((f) => ({
      ...f,
      orgID: orgId,
      accountRegisterID: null,
      partyTID: null,
      voucherID: null,
      vCode: 1
    }));
    if (!orgId) {
      this.accountRegisters.set([]);
      this.parties.set([]);
      this.vouchers.set([]);
      return;
    }
    this.loadOrgDependents(orgId);
  }

  private loadOrgDependents(orgId: number): void {
    this.audit.getAccountRegisters(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      this.accountRegisters.set(r);
      if (r.length) {
        this.errorMessage.set(null);
      } else {
        this.errorMessage.set('No account register mapped for this school. Registers load from parent sanstha when configured.');
      }
    });
    this.audit.getParties(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => this.parties.set(p));
    this.loadVoucherList();
  }

  onAccountRegisterOrFyChange(): void {
    const f = this.form();
    if (f.orgID && f.accountRegisterID && f.fyID && !f.voucherID) {
      this.audit
        .getNextVCode(f.orgID, f.accountRegisterID, f.fyID, this.vType())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((code) => this.form.update((x) => ({ ...x, vCode: code })));
    }
    this.loadVoucherList();
  }

  loadVoucherList(): void {
    const f = this.form();
    if (!f.orgID) return;
    this.audit
      .getVouchers(f.orgID, this.vType(), f.fyID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.vouchers.set(list));
  }

  loadNarrations(ledgerHeadId: number | null): void {
    if (!ledgerHeadId) return;
    if (this.narrations()[ledgerHeadId]) return;
    this.audit
      .getLedgerNarrations(ledgerHeadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.narrations.update((n) => ({ ...n, [ledgerHeadId]: list })));
  }

  addDetailRow(): void {
    if (this.isViewMode()) return;
    this.form.update((f) => ({
      ...f,
      details: [...f.details, { srNo: f.details.length + 1, ledgerHeadId: null, ledgerHeadNarration: '', amount: 0 }]
    }));
  }

  removeDetailRow(index: number): void {
    if (this.isViewMode()) return;
    this.form.update((f) => {
      const details = f.details.filter((_, i) => i !== index).map((d, i) => ({ ...d, srNo: i + 1 }));
      return { ...f, details: details.length ? details : [{ srNo: 1, ledgerHeadId: null, ledgerHeadNarration: '', amount: 0 }] };
    });
  }

  newVoucher(): void {
    const orgId = this.form().orgID;
    const fyId = this.form().fyID;
    this.formMode.set('new');
    this.form.set({ ...this.emptyForm(), orgID: orgId, fyID: fyId, vDate: new Date().toISOString().slice(0, 10) });
    if (orgId) this.loadOrgDependents(orgId);
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

  private loadVoucher(voucherId: number, mode: FormMode): void {
    this.audit
      .getVoucher(voucherId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (!v) return;
        this.formMode.set(mode);
        this.applyVoucherToForm(v);
        this.loadOrgDependents(v.orgID);
        v.details.forEach((d) => this.loadNarrations(d.ledgerHeadID));
      });
  }

  private applyVoucherToForm(v: Voucher): void {
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
      filePath: v.filePath ?? '',
      fyID: v.fyID,
      details: v.details.length
        ? v.details.map((d) => ({
            srNo: d.srNo,
            ledgerHeadId: d.ledgerHeadID,
            ledgerHeadNarration: d.ledgerHeadNarration ?? '',
            amount: d.amount
          }))
        : [{ srNo: 1, ledgerHeadId: null, ledgerHeadNarration: '', amount: 0 }]
    });
  }

  save(): void {
    if (this.isViewMode()) return;
    const f = this.form();
    if (!f.orgID || !f.accountRegisterID || !f.fyID) {
      this.errorMessage.set('Org, Account Register and FY are required.');
      return;
    }
    if (!f.details.some((d) => d.ledgerHeadId && d.amount > 0)) {
      this.errorMessage.set('Add at least one detail line with ledger head and amount.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.audit
      .saveVoucher(this.vType(), f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.errorMessage.set('Unable to save voucher.');
          return;
        }
        this.loadVoucherList();
        this.pendingPrintVoucher.set(saved);
        this.showPrintPrompt.set(true);
      });
  }

  confirmPrint(): void {
    const v = this.pendingPrintVoucher();
    if (v) this.printService.printVoucher(v);
    this.dismissPrintPrompt();
  }

  dismissPrintPrompt(): void {
    this.showPrintPrompt.set(false);
    this.pendingPrintVoucher.set(null);
    this.newVoucher();
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
    this.newVoucher();
    this.errorMessage.set(null);
  }

  updateForm<K extends keyof VoucherFormState>(key: K, value: VoucherFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  updateDetail(index: number, field: keyof VoucherFormState['details'][0], value: unknown): void {
    this.form.update((f) => {
      const details = [...f.details];
      details[index] = { ...details[index], [field]: value };
      return { ...f, details };
    });
  }

  ledgerHeads(): LedgerHeadOption[] {
    return this.lookups()?.ledgerHeads ?? [];
  }

  bankLedgerHeads(): LedgerHeadOption[] {
    return this.lookups()?.bankLedgerHeads ?? [];
  }

  narrationList(ledgerHeadId: number | null): string[] {
    return ledgerHeadId ? this.narrations()[ledgerHeadId] ?? [] : [];
  }

  private emptyForm(): VoucherFormState {
    return {
      voucherID: null,
      orgID: null,
      accountRegisterID: null,
      vCode: 1,
      vDate: new Date().toISOString().slice(0, 10),
      partyTID: null,
      remark: '',
      paymentTypeID: CASH_PAYMENT_TYPE_ID,
      transactionNo: '',
      transactionDate: '',
      depositDate: '',
      ledgerHeadBankID: null,
      filePath: '',
      fyID: null,
      details: [{ srNo: 1, ledgerHeadId: null, ledgerHeadNarration: '', amount: 0 }]
    };
  }
}
