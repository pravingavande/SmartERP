import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../../core/services/dashboard.service';
import { TicketService } from '../../../core/services/ticket.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfile } from '../../../core/models/dashboard.model';
import {
  ReplyFormState,
  TicketDetail,
  TicketFormState,
  TicketListItem,
  TicketLookups
} from '../../../core/models/ticket.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { mapEventTicketBackendMessage, validateTicketForm, validateTicketReply } from '../../../core/utils/event-ticket-validation.util';

type FormMode = 'new' | 'edit' | 'view';

@Component({
  selector: 'app-ticket-entry',
  imports: [FormsModule, DatePipe],
  templateUrl: './ticket-entry.component.html',
  styleUrl: './ticket-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketEntryComponent {
  private readonly ticketService = inject(TicketService);
  private readonly toast = inject(ToastService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly lookupsLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly lookups = signal<TicketLookups | null>(null);
  readonly tickets = signal<TicketListItem[]>([]);
  readonly detail = signal<TicketDetail | null>(null);
  readonly form = signal<TicketFormState>(this.emptyForm());
  readonly replyForm = signal<ReplyFormState>({ replyText: '', replyStatus: '', attachment: '' });
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly selectedFileName = signal<string | null>(null);
  readonly listOrgID = signal<number | null>(null);
  readonly selectedOrgIds = signal<number[]>([]);

  readonly isViewMode = computed(() => this.formMode() === 'view');
  readonly canRaiseTicket = computed(() => this.lookups()?.canRaiseTicket ?? false);
  readonly isReadOnlyUser = computed(() => !this.canRaiseTicket());
  readonly canEditCurrent = computed(() => this.detail()?.canEdit ?? (this.canRaiseTicket() && !this.isViewMode()));
  readonly canReplyCurrent = computed(() => this.detail()?.canReply ?? false);
  readonly canCloseCurrent = computed(() => this.detail()?.canClose ?? false);

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
          this.errorMessage.set('Unable to load ticket masters. Please refresh or contact admin.');
          return;
        }
        if (!data.orgs.length) {
          this.errorMessage.set('No schools mapped for your login.');
          return;
        }

        const orgId = this.resolveDefaultOrgId(data, profile);
        this.listOrgID.set(data.isSansthaUser ? null : orgId);
        if (!data.isSansthaUser && orgId) {
          this.selectedOrgIds.set([orgId]);
        }
        this.loadList();
      });
  }

  private resolveDefaultOrgId(data: TicketLookups, profile: UserProfile | null): number | null {
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

  toggleSchool(orgId: number, checked: boolean): void {
    this.selectedOrgIds.update((ids) => {
      if (checked) return ids.includes(orgId) ? ids : [...ids, orgId];
      return ids.filter((id) => id !== orgId);
    });
    this.form.update((f) => ({ ...f, orgIDs: this.selectedOrgIds() }));
    this.fieldErrors.update((e) => removeFieldError(e, 'orgIDs'));
  }

  isSchoolSelected(orgId: number): boolean {
    return this.selectedOrgIds().includes(orgId);
  }

  loadList(): void {
    this.ticketService
      .getList(this.listOrgID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.tickets.set(list));
  }

  newEntry(): void {
    if (!this.canRaiseTicket()) return;
    const lookups = this.lookups();
    const defaultOrgIds = this.selectedOrgIds().length
      ? this.selectedOrgIds()
      : this.listOrgID()
        ? [this.listOrgID()!]
        : [];

    if (!defaultOrgIds.length) {
      this.errorMessage.set('Select at least one school before raising a ticket.');
      return;
    }

    this.formMode.set('new');
    this.formVisible.set(true);
    this.detail.set(null);
    this.errorMessage.set(null);
    this.selectedOrgIds.set(defaultOrgIds);
    this.form.set({
      ...this.emptyForm(),
      orgIDs: defaultOrgIds,
      priority: lookups?.priorities[1] ?? 'Medium',
      replyRequired: lookups?.replyRequiredOptions[0] ?? 'Instant',
      module: lookups?.modules[0]?.moduleName ?? ''
    });
    this.replyForm.set({ replyText: '', replyStatus: '', attachment: '' });
    this.selectedFileName.set(null);
  }

  viewEntry(item: TicketListItem): void {
    this.loadEntry(item.ticketID, 'view');
  }

  editEntry(item: TicketListItem): void {
    if (!this.canRaiseTicket()) {
      this.viewEntry(item);
      return;
    }
    this.loadEntry(item.ticketID, 'edit');
  }

  private loadEntry(ticketId: number, mode: FormMode): void {
    this.ticketService
      .getById(ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((detail) => {
        if (!detail) return;
        this.formMode.set(mode === 'edit' && !detail.canEdit ? 'view' : mode);
        this.formVisible.set(true);
        this.detail.set(detail);
        this.applyTicketToForm(detail);
        this.selectedFileName.set(detail.ticket.attachment ?? null);
        this.errorMessage.set(null);
      });
  }

  private applyTicketToForm(detail: TicketDetail): void {
    const t = detail.ticket;
    const orgIds = this.parseOrgIds(t.orgIDs, t.orgID);
    this.selectedOrgIds.set(orgIds);
    this.form.set({
      ticketID: t.ticketID,
      orgIDs: orgIds,
      ticketDate: this.toLocalDateTimeInput(t.ticketDate),
      subject: t.subject ?? '',
      description: t.description ?? '',
      module: t.module ?? '',
      priority: t.priority ?? 'Medium',
      replyRequired: t.replyRequired ?? 'Instant',
      attachment: t.attachment ?? ''
    });
  }

  private parseOrgIds(orgIds: string | null | undefined, fallbackOrgId: number): number[] {
    if (orgIds) {
      const parsed = orgIds
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => x > 0);
      if (parsed.length) return parsed;
    }
    return [fallbackOrgId];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.ticketService.uploadFile(file).subscribe((stored) => {
      if (!stored) {
        this.toast.showError('File upload failed.');
        return;
      }
      this.selectedFileName.set(file.name);
      this.form.update((f) => ({ ...f, attachment: stored }));
    });
  }

  save(): void {
    if (!this.canEditCurrent()) return;
    const f = this.form();
    const errors = validateTicketForm(f);
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
      .subscribe(({ data, message }) => {
        this.loading.set(false);
        if (!data) {
          const backendErrors = mapEventTicketBackendMessage(message);
          if (hasFieldErrors(backendErrors)) {
            this.fieldErrors.set(backendErrors);
          }
          const errorText = message ?? 'Unable to save ticket.';
          this.saveError.set(errorText);
          toastOnSave(this.toast, false, { entity: 'Ticket', mode: this.formMode(), errorMessage: errorText });
          return;
        }
        toastOnSave(this.toast, true, { entity: 'Ticket', mode: this.formMode() });
        this.detail.set(data);
        this.formMode.set('view');
        this.loadList();
      });
  }

  submitReply(): void {
    const ticketId = this.detail()?.ticket.ticketID ?? this.form().ticketID;
    if (!ticketId || !this.canReplyCurrent()) return;

    const reply = this.replyForm();
    const replyError = validateTicketReply(reply.replyText);
    if (replyError) {
      this.saveError.set(replyError);
      return;
    }

    this.loading.set(true);
    this.saveError.set(null);
    this.ticketService
      .addReply(ticketId, reply)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('Unable to save reply.');
          return;
        }
        this.detail.set(saved);
        this.replyForm.set({ replyText: '', replyStatus: '', attachment: '' });
        this.toast.showSuccess('Reply submitted.');
        this.loadList();
      });
  }

  closeTicket(): void {
    const ticketId = this.detail()?.ticket.ticketID;
    if (!ticketId || !this.canCloseCurrent()) return;

    this.loading.set(true);
    this.ticketService
      .close(ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        this.loading.set(false);
        if (!ok) {
          this.toast.showError('Only the ticket creator can close this ticket.');
          return;
        }
        this.toast.showSuccess('Ticket closed.');
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
    this.detail.set(null);
    this.selectedFileName.set(null);
    this.loadList();
  }

  updateForm<K extends keyof TicketFormState>(key: K, value: TicketFormState[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((x) => ({ ...x, [key]: value }));
  }

  updateReply<K extends keyof ReplyFormState>(key: K, value: ReplyFormState[K]): void {
    this.saveError.set(null);
    this.replyForm.update((x) => ({ ...x, [key]: value }));
  }

  statusLabel(item: { statusNameMr?: string | null; statusName?: string | null }): string {
    const mr = item.statusNameMr?.trim();
    if (mr) return mr;
    return item.statusName?.trim() || '—';
  }

  priorityClass(priority?: string | null): string {
    switch ((priority ?? '').toLowerCase()) {
      case 'critical': return 'priority-critical';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      default: return 'priority-low';
    }
  }

  private emptyForm(): TicketFormState {
    return {
      ticketID: null,
      orgIDs: [],
      ticketDate: this.currentLocalDateTime(),
      subject: '',
      description: '',
      module: '',
      priority: 'Medium',
      replyRequired: 'Instant',
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
