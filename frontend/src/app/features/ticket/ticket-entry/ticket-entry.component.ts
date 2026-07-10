import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../../core/services/dashboard.service';
import { TicketService } from '../../../core/services/ticket.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import { Ticket, TicketFormState, TicketListItem, TicketLookups } from '../../../core/models/ticket.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import { coerceEnglishNumber } from '../../../core/utils/marathi-numerals';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-ticket-entry',
  imports: [FormsModule, DatePipe, CurrencyPipe, MarathiNumberInputDirective],
  templateUrl: './ticket-entry.component.html',
  styleUrl: './ticket-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketEntryComponent {
  private readonly ticketService = inject(TicketService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly lookups = signal<TicketLookups | null>(null);
  readonly tickets = signal<TicketListItem[]>([]);
  readonly form = signal<TicketFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly selectedFileName = signal<string | null>(null);
  readonly listOrgID = signal<number | null>(null);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly schoolDisabled = computed(() => !this.lookups()?.isSansthaUser);

  constructor() {
    this.loadLookups();
  }

  loadLookups(): void {
    this.lookupsLoading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      lookups: this.ticketService.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookupsLoading.set(false);
        this.lookups.set(data);
        if (!data) {
          this.errorMessage.set('Unable to load schools and status list. Please refresh or contact admin.');
          return;
        }
        if (!data.statuses.length) {
          this.errorMessage.set('No ticket statuses found. Run database script 012_Ticket_Tables_Procedures.sql.');
          return;
        }
        if (!data.orgs.length) {
          this.errorMessage.set('No schools mapped for your login.');
          return;
        }

        const orgId = this.resolveDefaultOrgId(data, profile);
        this.listOrgID.set(orgId);
        this.loadList();
      });
  }

  private resolveDefaultOrgId(data: TicketLookups, profile: UserProfile | null): number | null {
    if (data.isSansthaUser) return null;

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

  onOrgChange(orgId: number | null): void {
    if (this.isViewMode() || this.schoolDisabled()) return;
    this.fieldErrors.update((e) => removeFieldError(e, 'orgID'));
    this.form.update((f) => ({ ...f, orgID: orgId, ticketID: null }));
  }

  loadList(): void {
    this.ticketService
      .getList(this.listOrgID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.tickets.set(list));
  }

  newEntry(): void {
    const lookups = this.lookups();
    const orgId = this.listOrgID() ?? this.resolveDefaultOrgId(lookups!, null);
    if (!orgId && lookups?.isSansthaUser) {
      this.errorMessage.set('Select school on the list page before adding new.');
      return;
    }

    this.formMode.set('new');
    this.formVisible.set(true);
    this.errorMessage.set(null);
    this.form.set({
      ...this.emptyForm(),
      orgID: orgId,
      ticketStatusID: lookups?.statuses[0]?.ticketStatusID ?? null
    });
    this.selectedFileName.set(null);
  }

  editEntry(item: TicketListItem): void {
    this.loadEntry(item.ticketID, 'edit');
  }

  viewEntry(item: TicketListItem): void {
    this.loadEntry(item.ticketID, 'view');
  }

  private loadEntry(ticketId: number, mode: FormMode): void {
    this.ticketService
      .getById(ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => {
        if (!t) return;
        this.formMode.set(mode);
        this.formVisible.set(true);
        this.applyTicketToForm(t);
        this.selectedFileName.set(t.attachment ?? null);
        this.errorMessage.set(null);
      });
  }

  private applyTicketToForm(t: Ticket): void {
    this.form.set({
      ticketID: t.ticketID,
      orgID: t.orgID,
      ticketDate: this.toLocalDateTimeInput(t.ticketDate),
      description: t.description ?? '',
      amount: t.amount ?? 0,
      ticketStatusID: t.ticketStatusID,
      attachment: t.attachment ?? ''
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFileName.set(file.name);
    this.form.update((f) => ({ ...f, attachment: file.name }));
  }

  save(): void {
    if (this.isViewMode()) return;
    this.form.update((f) => ({ ...f, amount: coerceEnglishNumber(f.amount) }));
    const f = this.form();
    const errors: FieldErrors = {};
    if (!f.orgID) {
      errors['orgID'] = 'शाळा आवश्यक आहे.';
    }
    if (!f.ticketStatusID) {
      errors['ticketStatusID'] = 'स्थिती आवश्यक आहे.';
    }
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.ticketService
      .save(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('टिकिट जतन करता आले नाही. API deploy आवश्यक असू शकते — admin ला सांगा.');
          return;
        }
        this.closeForm();
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
    this.selectedFileName.set(null);
    this.loadList();
  }

  updateForm<K extends keyof TicketFormState>(key: K, value: TicketFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((x) => ({ ...x, [key]: value }));
  }

  statusLabel(item: { statusNameMr?: string | null; statusName?: string | null }): string {
    const mr = item.statusNameMr?.trim();
    if (mr) return mr;
    return item.statusName?.trim() || '—';
  }

  private emptyForm(): TicketFormState {
    return {
      ticketID: null,
      orgID: null,
      ticketDate: this.currentLocalDateTime(),
      description: '',
      amount: 0,
      ticketStatusID: null,
      attachment: ''
    };
  }

  private currentLocalDateTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  private toLocalDateTimeInput(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return this.currentLocalDateTime();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
