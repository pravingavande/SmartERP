import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AccountRegisterMasterOption, AuditLookups } from '../../../core/models/audit.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { AuditService } from '../../../core/services/audit.service';
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
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly lookups = signal<AuditLookups | null>(null);
  readonly allRegisters = signal<AccountRegisterMasterOption[]>([]);
  readonly selectedOrgID = signal<number | null>(null);
  readonly selectedRegisterIds = signal<Set<number>>(new Set());

  readonly selectedCount = computed(() => this.selectedRegisterIds().size);

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
        this.lookups.set(lookups);
        this.allRegisters.set(registers);
        if (!lookups?.orgs?.length) {
          this.errorMessage.set('No schools found for your login.');
          return;
        }
        const orgId = this.resolveDefaultOrgId(lookups, profile);
        if (orgId) {
          this.selectedOrgID.set(orgId);
          this.loadMapping(orgId);
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
    if (!orgId) {
      this.fieldErrors.set({ orgID: 'Select a school / org first.' });
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    const ids = Array.from(this.selectedRegisterIds());
    this.audit
      .saveAccountRegisterDefine(orgId, ids)
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
