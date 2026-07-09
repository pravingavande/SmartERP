import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AuditLookups,
  LedgerHeadFormState,
  LedgerHeadMaster,
  LedgerTypeOption
} from '../../../core/models/audit.model';
import { AuditService } from '../../../core/services/audit.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { UserProfile } from '../../../core/models/dashboard.model';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-ledger-head-master',
  imports: [FormsModule],
  templateUrl: './ledger-head-master.component.html',
  styleUrl: './ledger-head-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LedgerHeadMasterComponent {
  private readonly audit = inject(AuditService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly lookups = signal<AuditLookups | null>(null);
  readonly ledgerTypes = signal<LedgerTypeOption[]>([]);
  readonly ledgerHeads = signal<LedgerHeadMaster[]>([]);
  readonly form = signal<LedgerHeadFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly listOrgID = signal<number | null>(null);

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.audit.getLookups(),
      ledgerTypes: this.audit.getLedgerTypes(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, ledgerTypes, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        this.ledgerTypes.set(ledgerTypes);
        if (!data?.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
          return;
        }
        if (!ledgerTypes.length) {
          this.errorMessage.set('No ledger types found.');
          return;
        }
        const orgId = this.resolveDefaultOrgId(data, profile);
        this.listOrgID.set(orgId);
        if (orgId) this.loadList();
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
    this.closeForm();
    if (orgId) this.loadList();
    else this.ledgerHeads.set([]);
  }

  loadList(): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.audit
      .getLedgerHeadList(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.ledgerHeads.set(list));
  }

  newEntry(): void {
    const orgId = this.listOrgID();
    if (!orgId) {
      this.errorMessage.set('Select Org / School on the list page before adding new.');
      return;
    }
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.form.set({
      ...this.emptyForm(),
      underOrgID: orgId,
      ledgerTypeID: this.ledgerTypes()[0]?.ledgerTypeID ?? null
    });
    this.refreshNextSrNo(orgId);
  }

  editEntry(item: LedgerHeadMaster): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.form.set({
      ledgerHeadID: item.ledgerHeadID,
      underOrgID: item.underOrgID,
      srNo: item.srNo,
      ledgerHead: item.ledgerHead,
      ledgerHeadShort: item.ledgerHeadShort ?? '',
      ledgerTypeID: item.ledgerTypeID,
      isActive: item.isActive
    });
  }

  private refreshNextSrNo(orgId: number): void {
    this.audit
      .getNextLedgerHeadSrNo(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((srNo) => this.form.update((f) => ({ ...f, srNo })));
  }

  save(): void {
    const f = this.form();
    if (!f.underOrgID || !f.ledgerHead.trim() || !f.ledgerTypeID) {
      this.errorMessage.set('School, ledger head name and type are required.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.audit
      .saveLedgerHead(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.errorMessage.set('Unable to save ledger head.');
          return;
        }
        this.closeForm();
        this.loadList();
      });
  }

  cancel(): void {
    this.closeForm();
    this.errorMessage.set(null);
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.formMode.set('new');
  }

  updateForm<K extends keyof LedgerHeadFormState>(key: K, value: LedgerHeadFormState[K]): void {
    this.form.update((x) => ({ ...x, [key]: value }));
  }

  private emptyForm(): LedgerHeadFormState {
    return {
      ledgerHeadID: null,
      underOrgID: null,
      srNo: 1,
      ledgerHead: '',
      ledgerHeadShort: '',
      ledgerTypeID: null,
      isActive: true
    };
  }
}
