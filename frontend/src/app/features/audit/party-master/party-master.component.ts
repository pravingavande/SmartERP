import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuditLookups, PartyFormState, PartyMaster } from '../../../core/models/audit.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import { coerceEnglishIntegerString } from '../../../core/utils/marathi-numerals';
import { AuditService } from '../../../core/services/audit.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { mapBackendMessageToFieldErrors, validatePartyForm } from '../../../core/utils/master-validation.util';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-party-master',
  imports: [FormsModule, MarathiNumberInputDirective],
  templateUrl: './party-master.component.html',
  styleUrl: './party-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartyMasterComponent {
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
  readonly parties = signal<PartyMaster[]>([]);
  readonly form = signal<PartyFormState>(this.emptyForm());
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
    else this.parties.set([]);
  }

  loadList(): void {
    const orgId = this.listOrgID();
    if (!orgId) return;
    this.audit
      .getPartyList(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.parties.set(list));
  }

  newParty(): void {
    const orgId = this.listOrgID();
    if (!orgId) {
      this.errorMessage.set('Select Org / School on the list page before adding new.');
      return;
    }
    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({ ...this.emptyForm(), orgID: orgId });
  }

  editParty(item: PartyMaster): void {
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      partyID: item.partyID,
      orgID: item.orgID,
      partyName: item.partyName,
      address: item.address ?? '',
      mobNo: item.mobNo ?? '',
      panNo: item.panNo ?? '',
      gstNo: item.gstNo ?? '',
      isActive: item.isActive
    });
  }

  save(): void {
    this.form.update((f) => ({
      ...f,
      mobNo: coerceEnglishIntegerString(f.mobNo, 10)
    }));
    const f = this.form();
    const errors = validatePartyForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.audit
      .saveParty(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.loading.set(false);
        if (!data) {
          const backendErrors = mapBackendMessageToFieldErrors(message);
          if (hasFieldErrors(backendErrors)) {
            this.fieldErrors.set(backendErrors);
          }
          const errorText = message ?? 'Unable to save party.';
          this.saveError.set(errorText);
          toastOnSave(this.toast, false, { entity: 'Party', mode: this.formMode(), errorMessage: errorText });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Party', mode: this.formMode() });
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
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  updateForm<K extends keyof PartyFormState>(key: K, value: PartyFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((x) => ({ ...x, [key]: value }));
  }

  private emptyForm(): PartyFormState {
    return {
      partyID: null,
      orgID: null,
      partyName: '',
      address: '',
      mobNo: '',
      panNo: '',
      gstNo: '',
      isActive: true
    };
  }
}
