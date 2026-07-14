import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EventCalendarService } from '../../../core/services/event-calendar.service';
import { ToastService } from '../../../core/services/toast.service';
import { EventLookups, EventType, SaveEventTypeRequest } from '../../../core/models/calendar.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { mapEventTicketBackendMessage, validateEventTypeForm } from '../../../core/utils/event-ticket-validation.util';
import { pageCount, paginateRows } from '../../../core/utils/master-list.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-event-types-master',
  imports: [FormsModule, MasterListPaginationComponent],
  templateUrl: './event-types-master.component.html',
  styleUrl: './event-types-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventTypesMasterComponent {
  private readonly calendarService = inject(EventCalendarService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(true);
  readonly lookupsLoading = signal(true);
  readonly saveError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly lookups = signal<EventLookups | null>(null);
  readonly items = signal<EventType[]>([]);
  readonly filterOrgId = signal<number | null>(null);
  readonly form = signal<SaveEventTypeRequest>(this.emptyForm());
  readonly formMode = signal<FormMode>('new');
  readonly formVisible = signal(false);
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  readonly listPageCount = computed(() => pageCount(this.items().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.items(), this.listPageIndex(), this.listPageSize()));

  readonly canManage = computed(() => this.lookups()?.canManageEvents ?? false);

  constructor() {
    this.calendarService.getLookups().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.lookupsLoading.set(false);
      this.lookups.set(data);
      if (!data) {
        this.errorMessage.set('Unable to load organizations. Please sign in again or contact admin.');
        this.listLoading.set(false);
        return;
      }
      if (!this.sansthaOrgsFrom(data).length) {
        this.errorMessage.set('No organization mapped for your login.');
        this.listLoading.set(false);
        return;
      }
      if (!data.canManageEvents) {
        this.errorMessage.set('Read-only access — viewing event types only.');
      }
      const defaultOrg = data.sansthaOrgs[0] ?? data.orgs[0]?.orgID ?? null;
      this.filterOrgId.set(defaultOrg);
      this.loadList();
    });
  }

  loadList(): void {
    const orgId = this.filterOrgId();
    if (!orgId) {
      this.listLoading.set(false);
      return;
    }
    this.listLoading.set(true);
    this.calendarService.getEventTypes(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((list) => {
      this.listLoading.set(false);
      this.items.set(list);
      this.listPageIndex.set(0);
    });
  }

  onOrgFilterChange(orgId: number | null): void {
    this.filterOrgId.set(orgId);
    this.listPageIndex.set(0);
    this.closeForm();
    this.loadList();
  }

  goToListPage(index: number): void {
    const max = this.listPageCount() - 1;
    this.listPageIndex.set(Math.max(0, Math.min(index, max)));
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPageIndex.set(0);
  }

  newItem(): void {
    if (!this.canManage()) return;
    const orgId = this.filterOrgId();
    if (!orgId) return;
    this.formMode.set('new');
    this.formVisible.set(true);
    this.form.set({ ...this.emptyForm(), underOrgID: orgId });
    this.fieldErrors.set({});
    this.saveError.set(null);
  }

  editItem(item: EventType): void {
    if (!this.canManage()) return;
    this.formMode.set('edit');
    this.formVisible.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      eventTypeID: item.eventTypeID,
      underOrgID: item.underOrgID,
      eventType: item.eventType,
      isActive: item.isActive
    });
  }

  deleteItem(item: EventType): void {
    if (!this.canManage()) return;
    if (!confirm(`Deactivate event type "${item.eventType}"?`)) return;
    this.calendarService.deleteEventType(item.eventTypeID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ success, message }) => {
      if (!success) {
        this.toast.showError(message ?? 'Unable to delete event type.', 'Delete failed');
        return;
      }
      this.toast.showSuccess('Event type deactivated.', 'Deleted');
      this.loadList();
    });
  }

  save(): void {
    if (!this.canManage()) return;
    const f = this.form();
    const errors = validateEventTypeForm(f);
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.calendarService.saveEventType({ ...f, eventType: f.eventType.trim() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        const backendErrors = mapEventTicketBackendMessage(message);
        if (hasFieldErrors(backendErrors)) {
          this.fieldErrors.set(backendErrors);
        }
        const errorText = message ?? 'Unable to save event type.';
        this.saveError.set(errorText);
        toastOnSave(this.toast, false, { entity: 'Event Type', mode: this.formMode(), errorMessage: errorText });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Event Type', mode: this.formMode() });
      this.closeForm();
    });
  }

  cancel(): void { this.closeForm(); }

  closeForm(): void {
    this.formVisible.set(false);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.loadList();
  }

  updateForm<K extends keyof SaveEventTypeRequest>(key: K, value: SaveEventTypeRequest[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((x) => ({ ...x, [key]: value }));
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  editSrNo(): number | null {
    const id = this.form().eventTypeID;
    if (!id) return null;
    return this.items().find((i) => i.eventTypeID === id)?.srNo ?? null;
  }

  sansthaOrgs() {
    const lookups = this.lookups();
    return lookups ? this.sansthaOrgsFrom(lookups) : [];
  }

  private sansthaOrgsFrom(lookups: EventLookups) {
    const ids = new Set(lookups.sansthaOrgs);
    return lookups.orgs.filter((o) => ids.has(o.orgID) || o.orgID === o.underOrgID || ids.size === 0);
  }

  private emptyForm(): SaveEventTypeRequest {
    return { eventTypeID: null, underOrgID: 0, eventType: '', isActive: true };
  }
}
