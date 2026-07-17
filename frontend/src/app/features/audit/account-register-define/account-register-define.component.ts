import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AccountRegisterMasterOption, AuditLookups, OrgOption } from '../../../core/models/audit.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { requireId } from '../../../core/utils/master-validation.util';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfile } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-account-register-define',
  imports: [FormsModule],
  templateUrl: './account-register-define.component.html',
  styleUrl: './account-register-define.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountRegisterDefineComponent {
  private readonly audit = inject(AuditService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly lookups = signal<AuditLookups | null>(null);
  readonly allRegisters = signal<AccountRegisterMasterOption[]>([]);
  /** Selected Under Org / Sanstha — same as Ledger Head Master listOrgID. */
  readonly selectedOrgID = signal<number | null>(null);
  readonly selectedRegisterIds = signal<Set<number>>(new Set());

  readonly selectedCount = computed(() => this.selectedRegisterIds().size);
  /** Same as Ledger Head Master — sanstha options. */
  readonly sansthaOrgs = computed(() => this.lookups()?.sansthaOrgs ?? []);

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.audit.getLookups(),
      registers: this.audit.getAccountRegisterMaster(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups, registers, profile }) => {
        this.lookupsLoading.set(false);
        const sansthaOrgs = this.resolveSansthaOrgs(lookups?.sansthaOrgs ?? []);
        this.lookups.set(lookups ? { ...lookups, sansthaOrgs } : null);
        this.allRegisters.set(registers);
        if (!sansthaOrgs.length) {
          this.errorMessage.set('No Sanstha found for your login.');
          return;
        }
        const orgId = this.resolveDefaultOrgId(sansthaOrgs, profile);
        if (orgId) {
          this.selectedOrgID.set(orgId);
          this.loadMapping(orgId);
        }
      });
  }

  /** Same as Ledger Head Master. */
  private resolveSansthaOrgs(fromApi: OrgOption[]): OrgOption[] {
    if (fromApi.length) return fromApi;

    const session = this.auth.currentUser();
    const orgs: OrgOption[] = [];

    for (const ctx of session?.schoolContexts ?? []) {
      if (!orgs.some((o) => o.orgID === ctx.sansthaId)) {
        orgs.push({
          orgID: ctx.sansthaId,
          organizationName: ctx.sansthaName,
          schoolCode: ctx.sansthaId
        });
      }
    }

    if (!orgs.length && session?.sansthaId && session.sansthaName) {
      orgs.push({
        orgID: session.sansthaId,
        organizationName: session.sansthaName,
        schoolCode: session.sansthaId
      });
    }

    return orgs;
  }

  /** Same as Ledger Head Master. */
  private resolveDefaultOrgId(orgs: OrgOption[], profile: UserProfile | null): number | null {
    const session = this.auth.currentUser();
    if (session?.sansthaId) {
      const match = orgs.find((o) => o.orgID === session.sansthaId);
      if (match) return match.orgID;
    }
    if (profile?.schoolCode) {
      const match = orgs.find((o) => o.schoolCode === profile.schoolCode);
      if (match) return match.orgID;
    }
    return orgs[0]?.orgID ?? null;
  }

  onOrgChange(orgId: number | null): void {
    this.selectedOrgID.set(orgId);
    this.fieldErrors.update((e) => removeFieldError(e, 'orgID'));
    this.errorMessage.set(null);
    this.saveError.set(null);
    if (orgId) this.loadMapping(orgId);
    else this.selectedRegisterIds.set(new Set());
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  loadMapping(orgId: number): void {
    this.audit
      .getAccountRegisterDefine(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.selectedRegisterIds.set(new Set(data?.accountRegisterIds ?? []));
      });
  }

  toggleRegister(id: number, checked: boolean): void {
    this.selectedRegisterIds.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  isSelected(id: number): boolean {
    return this.selectedRegisterIds().has(id);
  }

  save(): void {
    const orgId = this.selectedOrgID();
    const errors = requireId(orgId, 'orgID', 'Org / Sanstha');
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    const ids = Array.from(this.selectedRegisterIds());
    this.audit
      .saveAccountRegisterDefine(orgId!, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        this.loading.set(false);
        if (!ok) {
          this.saveError.set('Unable to save account register mapping.');
          this.toast.showError('Unable to save account register mapping.', 'Save failed');
          return;
        }
        this.toast.showSuccess('Account registers saved successfully.', 'Saved');
      });
  }
}
