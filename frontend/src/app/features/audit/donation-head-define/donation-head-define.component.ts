import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditLookups } from '../../../core/models/audit.model';
import { DRHeadOption } from '../../../core/models/donation.model';
import { AuditService } from '../../../core/services/audit.service';
import { DonationService } from '../../../core/services/donation.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';

@Component({
  selector: 'app-donation-head-define',
  imports: [FormsModule],
  templateUrl: './donation-head-define.component.html',
  styleUrl: './donation-head-define.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonationHeadDefineComponent {
  private readonly audit = inject(AuditService);
  private readonly donation = inject(DonationService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly lookups = signal<AuditLookups | null>(null);
  readonly allHeads = signal<DRHeadOption[]>([]);
  readonly selectedOrgID = signal<number | null>(null);
  readonly selectedHeadIds = signal<Set<number>>(new Set());

  readonly selectedCount = computed(() => this.selectedHeadIds().size);

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.lookupsLoading.set(true);
    forkJoin({
      lookups: this.audit.getLookups(),
      heads: this.donation.getDRHeadMaster(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups, heads, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(lookups);
        this.allHeads.set(heads);
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
    this.successMessage.set(null);
    if (orgId) this.loadMapping(orgId);
    else this.selectedHeadIds.set(new Set());
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  loadMapping(orgId: number): void {
    this.donation
      .getDRHeadDefine(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.selectedHeadIds.set(new Set(data?.drHeadIds ?? []));
      });
  }

  toggleHead(id: number, checked: boolean): void {
    this.selectedHeadIds.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  isSelected(id: number): boolean {
    return this.selectedHeadIds().has(id);
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
    this.successMessage.set(null);
    const ids = Array.from(this.selectedHeadIds());
    this.donation
      .saveDRHeadDefine(orgId, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        this.loading.set(false);
        if (!ok) {
          this.saveError.set('Unable to save donation head mapping.');
          return;
        }
        this.successMessage.set('Donation heads saved successfully.');
      });
  }
}
