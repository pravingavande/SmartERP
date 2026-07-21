import { ListActionBtnComponent } from '../../../shared/components/list-action-btn/list-action-btn.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EventCalendarService } from '../../../core/services/event-calendar.service';
import { ToastService } from '../../../core/services/toast.service';
import { EventLookups, EventType, SaveEventTypeRequest } from '../../../core/models/calendar.model';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../../core/utils/form-field-errors';
import { ImportLanguage, matchesImportLanguage } from '../../../core/utils/import-language.util';
import { toastOnSave } from '../../../core/utils/toast-save.util';
import { mapEventTicketBackendMessage, validateEventTypeForm } from '../../../core/utils/event-ticket-validation.util';
import { pageCount, paginateRows } from '../../../core/utils/master-list.util';
import { MasterListPaginationComponent } from '../../../shared/components/master-list-pagination/master-list-pagination.component';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-event-types-master',
  imports: [FormsModule, MasterListPaginationComponent, ListActionBtnComponent],
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
  readonly importVisible = signal(false);
  readonly importLoading = signal(false);
  readonly importSourceLoading = signal(false);
  readonly importSourceItems = signal<EventType[]>([]);
  readonly importSelectedIds = signal<Set<number>>(new Set());
  readonly importLanguage = signal<ImportLanguage>('M');
  readonly listPageSize = signal(10);
  readonly listPageIndex = signal(0);

  private static readonly ImportSourceOrgID = 1;

  readonly listPageCount = computed(() => pageCount(this.items().length, this.listPageSize()));
  readonly paginatedItems = computed(() => paginateRows(this.items(), this.listPageIndex(), this.listPageSize()));
  readonly canManage = computed(() => this.lookups()?.canManageEvents ?? false);
  readonly canImport = computed(() => {
    const orgId = this.filterOrgId();
    return this.canManage() && orgId != null && orgId > 0 && orgId !== EventTypesMasterComponent.ImportSourceOrgID;
  });
  readonly importSelectedCount = computed(() => this.importSelectedIds().size);
  readonly filteredImportSourceItems = computed(() => {
    const lang = this.importLanguage();
    return this.importSourceItems().filter((item) => matchesImportLanguage(item.eventType, lang));
  });
  readonly importAllSelected = computed(() => {
    const items = this.filteredImportSourceItems();
    const selected = this.importSelectedIds();
    return items.length > 0 && items.every((x) => selected.has(x.eventTypeID));
  });
  readonly selectedOrgName = computed(() => {
    const orgId = this.filterOrgId();
    return this.sansthaOrgs().find((o) => o.orgID === orgId)?.organizationName ?? '—';
  });

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
    this.closeImport();
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

  openImport(): void {
    const orgId = this.filterOrgId();
    if (!orgId) {
      this.errorMessage.set('Select organization before importing.');
      return;
    }
    if (!this.canImport()) {
      this.errorMessage.set('Import is not available for the source organization.');
      return;
    }
    this.closeForm();
    this.importVisible.set(true);
    this.importLanguage.set('M');
    this.importSelectedIds.set(new Set());
    this.importSourceLoading.set(true);
    this.calendarService
      .getEventTypes(EventTypesMasterComponent.ImportSourceOrgID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.importSourceLoading.set(false);
        this.importSourceItems.set(list.filter((x) => x.isActive !== false));
      });
  }

  closeImport(): void {
    this.importVisible.set(false);
    this.importLoading.set(false);
    this.importSourceLoading.set(false);
    this.importSourceItems.set([]);
    this.importSelectedIds.set(new Set());
    this.importLanguage.set('M');
  }

  onImportLanguageChange(lang: ImportLanguage): void {
    this.importLanguage.set(lang);
    const visibleIds = new Set(this.filteredImportSourceItems().map((x) => x.eventTypeID));
    this.importSelectedIds.update((selected) => {
      const next = new Set<number>();
      for (const id of selected) {
        if (visibleIds.has(id)) next.add(id);
      }
      return next;
    });
  }

  toggleImportItem(id: number, checked: boolean): void {
    this.importSelectedIds.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  isImportSelected(id: number): boolean {
    return this.importSelectedIds().has(id);
  }

  selectAllImport(): void {
    this.importSelectedIds.set(new Set(this.filteredImportSourceItems().map((x) => x.eventTypeID)));
  }

  unselectAllImport(): void {
    this.importSelectedIds.set(new Set());
  }

  confirmImport(): void {
    const orgId = this.filterOrgId();
    const ids = Array.from(this.importSelectedIds());
    if (!orgId || !this.canImport()) {
      this.toast.showError('Select a destination organization first.', 'Import');
      return;
    }
    if (!ids.length) {
      this.toast.showError('Select at least one event type to import.', 'Import');
      return;
    }

    this.importLoading.set(true);
    this.calendarService
      .importEventTypes(orgId, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.importLoading.set(false);
        if (!data) {
          this.toast.showError(message ?? 'Unable to import event types.', 'Import failed');
          return;
        }
        this.closeImport();
        this.loadList();
        this.toast.showSuccess(
          message ?? `Imported ${data.importedCount} event type(s). Skipped ${data.skippedCount}.`,
          'Imported'
        );
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
