import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditPrintService } from '../../../core/services/audit-print.service';
import { AuditService } from '../../../core/services/audit.service';
import { DashboardService } from '../../../core/services/dashboard.service';
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
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

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
  readonly formVisible = signal(false);
  readonly showPrintPrompt = signal(false);
  readonly pendingPrintVoucher = signal<Voucher | null>(null);
  readonly listOrgID = signal<number | null>(null);
  readonly listFyID = signal<number | null>(null);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isCashPayment = computed(() => this.form().paymentTypeID === CASH_PAYMENT_TYPE_ID);
  readonly totalAmount = computed(() =>
    this.form().details.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  );
  readonly showBankFields = computed(() => !this.isCashPayment());
  readonly isPaymentVoucher = computed(() => this.vType() === 'P');
  readonly activeFy = computed(() => {
    const fyId = this.listFyID();
    return this.lookups()?.fyList.find((fy) => fy.fyID === fyId) ?? null;
  });
  readonly fyDisplayName = computed(() => this.activeFy()?.fyName ?? '—');
  readonly voucherDateMin = computed(() => this.activeFy()?.fromDate.slice(0, 10) ?? '');
  readonly voucherDateMax = computed(() => this.activeFy()?.toDate.slice(0, 10) ?? '');

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
    this.form.update((f) => ({ ...f, orgID: orgId }));
    if (!orgId) {
      this.accountRegisters.set([]);
      this.parties.set([]);
      this.vouchers.set([]);
      return;
    }
    this.loadOrgDependents(orgId, true);
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
    this.audit.getParties(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => this.parties.set(p));
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
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.audit
      .getVouchers(orgId, this.vType(), this.listFyID())
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
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.form.set({
      ...this.emptyForm(),
      orgID: orgId,
      fyID: fyId,
      vDate: this.clampDateToFy(new Date().toISOString().slice(0, 10), fy)
    });
    this.loadOrgDependents(orgId, false);
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
        this.formVisible.set(true);
        this.applyVoucherToForm(v);
        this.listOrgID.set(v.orgID);
        this.listFyID.set(v.fyID);
        this.audit.getAccountRegisters(v.orgID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => this.accountRegisters.set(r));
        this.audit.getParties(v.orgID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => this.parties.set(p));
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
      bankName: v.bankName ?? '',
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
    if (f.details.length < 1) {
      this.errorMessage.set('At least one detail line is required.');
      return;
    }
    if (!f.details.some((d) => d.ledgerHeadId)) {
      this.errorMessage.set('Select ledger head on at least one detail line.');
      return;
    }
    if (this.totalAmount() <= 0) {
      this.errorMessage.set('Total amount must be greater than zero.');
      return;
    }
    if (!this.isDateWithinFy(f.vDate)) {
      this.errorMessage.set('Voucher date must be within the active financial year.');
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
          this.errorMessage.set('Unable to save voucher. Check detail lines and total amount.');
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
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
    this.errorMessage.set(null);
    this.loadVoucherList();
  }

  browseFile(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.updateForm('filePath', file.name);
    }
  }

  onVoucherDateChange(value: string): void {
    this.updateForm('vDate', this.clampDateToFy(value, this.activeFy()));
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

  private isDateWithinFy(date: string): boolean {
    const fy = this.activeFy();
    if (!fy || !date) return false;
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
      bankName: '',
      filePath: '',
      fyID: null,
      details: [{ srNo: 1, ledgerHeadId: null, ledgerHeadNarration: '', amount: 0 }]
    };
  }
}
