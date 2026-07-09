import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  LedgerHeadFormState,
  LedgerHeadMaster,
  LedgerTypeOption,
  OrgOption
} from '../../../core/models/audit.model';
import { AuditService } from '../../../core/services/audit.service';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
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
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly sansthaOrgs = signal<OrgOption[]>([]);
  readonly ledgerTypes = signal<LedgerTypeOption[]>([]);
  readonly ledgerHeads = signal<LedgerHeadMaster[]>([]);
  readonly form = signal<LedgerHeadFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly listOrgID = signal<number | null>(null);
  readonly listLedgerTypeID = signal<number | null>(null);
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly filteredLedgerHeads = computed(() => {
    const typeId = this.listLedgerTypeID();
    const list = this.ledgerHeads();
    if (!typeId) return list;
    return list.filter((h) => h.ledgerTypeID === typeId);
  });
  readonly listPageCount = computed(() => {
    const total = this.filteredLedgerHeads().length;
    return Math.max(1, Math.ceil(total / this.listPageSize()));
  });
  readonly paginatedLedgerHeads = computed(() => {
    const list = this.filteredLedgerHeads();
    const start = this.listPageIndex() * this.listPageSize();
    return list.slice(start, start + this.listPageSize());
  });
  readonly listPageStart = computed(() => {
    const total = this.filteredLedgerHeads().length;
    if (!total) return 0;
    return this.listPageIndex() * this.listPageSize() + 1;
  });
  readonly listPageEnd = computed(() => {
    const total = this.filteredLedgerHeads().length;
    if (!total) return 0;
    return Math.min(total, (this.listPageIndex() + 1) * this.listPageSize());
  });
  readonly selectedOrgName = computed(() => {
    const orgId = this.listOrgID();
    return this.sansthaOrgs().find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      sansthaOrgs: this.audit.getSansthaOrgs(),
      ledgerTypes: this.audit.getLedgerTypes(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ sansthaOrgs, ledgerTypes, profile }) => {
        this.lookupsLoading.set(false);
        this.sansthaOrgs.set(sansthaOrgs);
        this.ledgerTypes.set(ledgerTypes);
        if (!sansthaOrgs.length) {
          this.errorMessage.set('No Sanstha schools found for your login.');
          return;
        }
        if (!ledgerTypes.length) {
          this.errorMessage.set('No ledger types found.');
          return;
        }
        const orgId = this.resolveDefaultOrgId(sansthaOrgs, profile);
        this.listOrgID.set(orgId);
        if (orgId) this.loadList();
      });
  }

  private resolveDefaultOrgId(orgs: OrgOption[], profile: UserProfile | null): number | null {
    if (profile?.orgId) {
      const match = orgs.find((o) => o.orgID === profile.orgId);
      if (match) return match.orgID;
    }
    if (profile?.schoolCode) {
      const match = orgs.find((o) => o.schoolCode === profile.schoolCode);
      if (match) return match.orgID;
    }
    return orgs.length === 1 ? orgs[0].orgID : orgs[0]?.orgID ?? null;
  }

  onListOrgChange(orgId: number | null): void {
    this.listOrgID.set(orgId);
    this.listPageIndex.set(0);
    this.closeForm();
    if (orgId) this.loadList();
    else this.ledgerHeads.set([]);
  }

  onListLedgerTypeChange(typeId: number | null): void {
    this.listLedgerTypeID.set(typeId);
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

  loadList(): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.audit
      .getLedgerHeadList(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.ledgerHeads.set(list);
        const total = this.listLedgerTypeID()
          ? list.filter((h) => h.ledgerTypeID === this.listLedgerTypeID()).length
          : list.length;
        const maxPage = Math.max(0, Math.ceil(total / this.listPageSize()) - 1);
        if (this.listPageIndex() > maxPage) {
          this.listPageIndex.set(maxPage);
        }
      });
  }

  newEntry(): void {
    const orgId = this.listOrgID();
    if (!orgId) {
      this.errorMessage.set('Select Sanstha / Org on the list page before adding new.');
      return;
    }
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.form.set({
      ...this.emptyForm(),
      underOrgID: orgId,
      ledgerTypeID: this.listLedgerTypeID() ?? this.ledgerTypes()[0]?.ledgerTypeID ?? null
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
    const errors: FieldErrors = {};
    if (!f.underOrgID) {
      errors['underOrgID'] = 'Please select Sanstha / Org.';
    }
    if (!f.ledgerHead.trim()) {
      errors['ledgerHead'] = 'Please enter Ledger Head.';
    }
    if (!f.ledgerTypeID) {
      errors['ledgerTypeID'] = 'Please select Ledger Type.';
    }
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.audit
      .saveLedgerHead(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('Unable to save ledger head.');
          return;
        }
        this.closeForm();
        this.loadList();
      });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
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
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
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
