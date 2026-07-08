import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditPrintService } from '../../../core/services/audit-print.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DonationService } from '../../../core/services/donation.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import {
  CASH_PAYMENT_TYPE_ID,
  Donation,
  DonationFormState,
  DonationListItem,
  DonationLookups,
  DRHeadOption
} from '../../../core/models/donation.model';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-donation-entry',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './donation-entry.component.html',
  styleUrl: './donation-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonationEntryComponent {
  private readonly donation = inject(DonationService);
  private readonly printService = inject(AuditPrintService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
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

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly isCashPayment = computed(() => this.form().paymentTypeID === CASH_PAYMENT_TYPE_ID);
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
    this.closeForm();
    this.loadList();
  }

  onListFyChange(fyId: number | null): void {
    this.listFyID.set(fyId);
    this.closeForm();
    this.loadList();
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
      .subscribe((list) => this.donations.set(list));
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
    this.form.set({
      ...this.emptyForm(),
      orgID: orgId,
      fyID: fyId,
      receiptDate: new Date().toISOString().slice(0, 10)
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
    this.donation
      .getById(item.drID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        if (d) this.printService.printDonation(d);
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
      aadharNo: d.aadharNo ?? '',
      mobileNo: d.mobileNo ?? '',
      amount: d.amount ?? 0,
      paymentTypeID: d.paymentTypeID ?? CASH_PAYMENT_TYPE_ID,
      transactionNo: d.transactionNo ?? '',
      transactionDate: d.transactionDate?.slice(0, 10) ?? '',
      depositDate: d.depositDate ? d.depositDate.slice(0, 10) : '',
      remark: d.remark ?? '',
      fyID: d.fyID ?? null,
      orgID: d.orgID ?? null
    });
  }

  save(): void {
    if (this.isViewMode()) return;
    const f = this.form();
    if (!f.orgID || !f.fyID || !f.drHeadID) {
      this.errorMessage.set('Org, FY and Donation Head are required.');
      return;
    }
    if (!f.donorName.trim() || f.amount <= 0) {
      this.errorMessage.set('Donor name and amount are required.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.donation
      .save(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.errorMessage.set('Unable to save donation entry.');
          return;
        }
        this.loadList();
        this.pendingPrintDonation.set(saved);
        this.showPrintPrompt.set(true);
      });
  }

  confirmPrint(): void {
    const d = this.pendingPrintDonation();
    if (d) this.printService.printDonation(d);
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
    this.donation
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        if (d) this.printService.printDonation(d);
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
    this.form.update((x) => ({ ...x, [key]: value }));
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
      remark: '',
      fyID: null,
      orgID: null
    };
  }
}
