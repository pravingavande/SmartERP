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
  readonly listAccountRegisterID = signal<number | null>(null);
  readonly showPartyModal = signal(false);
  readonly partySaving = signal(false);
  readonly partyForm = signal({ partyName: '', mobNo: '', address: '' });
  readonly pendingAttachmentFile = signal<File | null>(null);
  readonly attachmentPreviewUrl = signal<string | null>(null);

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
  readonly activeFy = computed(() => {
    const fyId = this.formVisible() ? (this.form().fyID ?? this.listFyID()) : this.listFyID();
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
    this.form.update((f) => ({ ...f, fyID: fyId }));
    this.closeForm();
    this.loadVoucherList();
  }

  onListAccountRegisterChange(accountRegisterId: number | null): void {
    this.listAccountRegisterID.set(accountRegisterId);
    this.closeForm();
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
    this.clearAttachmentState();
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
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
    this.clearAttachmentState();
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
    const validationError = this.validateForm();
    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    const f = this.form();
    const vDate = f.vDate?.trim() || this.clampDateToFy(this.todayDateString(), this.activeFy()) || this.todayDateString();
    if (!f.vDate?.trim()) {
      this.updateForm('vDate', vDate);
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.audit
      .saveVoucher(this.vType(), { ...f, vDate })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.errorMessage.set('Unable to save voucher. Please check all required fields and try again.');
          return;
        }
        this.loadVoucherList();
        this.pendingPrintVoucher.set(saved);
        this.showPrintPrompt.set(true);
      });
  }

  private validateForm(): string | null {
    const f = this.form();

    if (!f.accountRegisterID) {
      return 'Please select Account Register.';
    }

    const vDate = f.vDate?.trim() || this.todayDateString();
    if (!vDate) {
      return 'Please enter Voucher Date.';
    }
    if (!this.isDateWithinFy(vDate)) {
      return 'Voucher Date must be within the selected Financial Year.';
    }

    if (!f.partyTID) {
      return 'Please select Party Name.';
    }

    if (!f.paymentTypeID) {
      return 'Please select Payment Type.';
    }

    if (f.details.length < 1) {
      return 'Please add at least one voucher detail row.';
    }

    for (const line of f.details) {
      if (!line.ledgerHeadId) {
        return `Please select Ledger Head on row ${line.srNo}.`;
      }
      if (!line.amount || line.amount <= 0) {
        return `Please enter Amount on row ${line.srNo}.`;
      }
    }

    if (this.totalAmount() <= 0) {
      return 'Please enter Amount.';
    }

    if (this.isChequePayment()) {
      if (!f.transactionNo?.trim()) {
        return 'Please enter Cheque Number.';
      }
      if (this.isReceiptVoucher()) {
        if (!f.bankName?.trim()) {
          return 'Please enter Bank Name.';
        }
        if (!f.ledgerHeadBankID) {
          return 'Please select Deposit Bank.';
        }
      } else if (this.isPaymentVoucher()) {
        if (!f.ledgerHeadBankID) {
          return 'Please select Bank Name.';
        }
      }
    }

    return null;
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
    this.clearAttachmentState();
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
    if (!file) return;
    this.revokeAttachmentPreview();
    this.pendingAttachmentFile.set(file);
    const previewUrl = URL.createObjectURL(file);
    this.attachmentPreviewUrl.set(previewUrl);
    this.updateForm('filePath', file.name);
    input.value = '';
  }

  viewAttachment(): void {
    const previewUrl = this.attachmentPreviewUrl();
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const filePath = this.form().filePath?.trim();
    if (!filePath) return;
    if (/^https?:\/\//i.test(filePath)) {
      window.open(filePath, '_blank', 'noopener,noreferrer');
      return;
    }
    alert(`Attachment saved as: ${filePath}\n\nRe-select the file using Browse to preview before saving.`);
  }

  removeAttachment(): void {
    if (!confirm('Remove this attachment?')) return;
    this.clearAttachmentState();
    this.updateForm('filePath', '');
  }

  hasAttachment(): boolean {
    return !!(this.form().filePath?.trim() || this.pendingAttachmentFile());
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
    const heads = this.lookups()?.ledgerHeads ?? [];
    if (!this.isReceiptVoucher()) return heads;
    return heads.filter((h) => h.ledgerTypeID === 2 || h.ledgerTypeID === 4);
  }

  bankLedgerHeads(): LedgerHeadOption[] {
    if (!this.isReceiptVoucher()) {
      return this.lookups()?.bankLedgerHeads ?? [];
    }
    const heads = this.lookups()?.ledgerHeads ?? [];
    return heads.filter((h) => [5, 6, 7, 8, 9].includes(h.ledgerTypeID ?? 0));
  }

  openPartyModal(): void {
    if (this.isViewMode() || this.isEditMode() || !this.form().orgID) return;
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
      this.errorMessage.set('Party name is required.');
      return;
    }
    this.partySaving.set(true);
    this.audit
      .saveParty({
        partyID: null,
        orgID: orgId,
        partyName: pf.partyName.trim(),
        address: pf.address,
        mobNo: pf.mobNo,
        panNo: '',
        gstNo: '',
        isActive: true
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.partySaving.set(false);
        if (!saved?.partyID) {
          this.errorMessage.set('Unable to save party.');
          return;
        }
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

  private clearAttachmentState(): void {
    this.revokeAttachmentPreview();
    this.pendingAttachmentFile.set(null);
  }

  private revokeAttachmentPreview(): void {
    const url = this.attachmentPreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.attachmentPreviewUrl.set(null);
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
