import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../../core/services/dashboard.service';
import { TicketService } from '../../../core/services/ticket.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import { Ticket, TicketFormState, TicketListItem, TicketLookups } from '../../../core/models/ticket.model';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-ticket-entry',
  imports: [FormsModule, DatePipe, CurrencyPipe],
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
  readonly lookups = signal<TicketLookups | null>(null);
  readonly tickets = signal<TicketListItem[]>([]);
  readonly form = signal<TicketFormState>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly selectedFileName = signal<string | null>(null);

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

        const defaultStatusId = data.statuses[0].ticketStatusID;
        const orgId = this.resolveDefaultOrgId(data, profile);

        this.form.update((f) => ({
          ...f,
          ticketStatusID: f.ticketStatusID ?? defaultStatusId,
          orgID: f.orgID ?? orgId
        }));
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

  onOrgChange(orgId: number | null): void {
    if (this.schoolDisabled()) return;
    this.form.update((f) => ({ ...f, orgID: orgId, ticketID: null }));
    this.formMode.set('new');
    this.loadList();
  }

  loadList(): void {
    const orgId = this.form().orgID;
    this.ticketService
      .getList(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.tickets.set(list));
  }

  newEntry(): void {
    const lookups = this.lookups();
    const orgId = this.form().orgID ?? (lookups ? this.resolveDefaultOrgId(lookups, null) : null);
    this.formMode.set('new');
    this.form.set({
      ...this.emptyForm(),
      orgID: orgId,
      ticketStatusID: this.lookups()?.statuses[0]?.ticketStatusID ?? null
    });
    this.selectedFileName.set(null);
    this.errorMessage.set(null);
    this.loadList();
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
        this.applyTicketToForm(t);
        this.selectedFileName.set(t.attachment ?? null);
        this.loadList();
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
    const f = this.form();
    if (!f.orgID || !f.ticketStatusID) {
      this.errorMessage.set('शाळा आणि स्थिती आवश्यक आहेत.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.ticketService
      .save(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.errorMessage.set('टिकिट जतन करता आले नाही. API deploy आवश्यक असू शकते — admin ला सांगा.');
          return;
        }
        this.newEntry();
        this.loadList();
      });
  }

  cancel(): void {
    this.newEntry();
    this.errorMessage.set(null);
  }

  updateForm<K extends keyof TicketFormState>(key: K, value: TicketFormState[K]): void {
    this.form.update((x) => ({ ...x, [key]: value }));
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
