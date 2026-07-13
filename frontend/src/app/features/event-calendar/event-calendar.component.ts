import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { EventCalendarService } from '../../core/services/event-calendar.service';
import { ToastService } from '../../core/services/toast.service';
import { CalendarEvent, EventLookups, LocationOption, SaveEventRequest } from '../../core/models/calendar.model';
import {
  buildMonthGrid,
  EVENT_STATUSES,
  formatMonthLabel,
  monthRange,
  toIsoDate
} from '../../core/constants/calendar.constants';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../core/utils/form-field-errors';
import { toastOnSave } from '../../core/utils/toast-save.util';
import { mapEventTicketBackendMessage, validateEventForm } from '../../core/utils/event-ticket-validation.util';

@Component({
  selector: 'app-event-calendar',
  imports: [FormsModule, DatePipe],
  templateUrl: './event-calendar.component.html',
  styleUrl: './event-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventCalendarComponent {
  private readonly calendarService = inject(EventCalendarService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly monthReload$ = new Subject<void>();
  private readonly locationSearch$ = new Subject<string>();

  readonly statuses = EVENT_STATUSES;
  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  readonly loading = signal(false);
  readonly showModal = signal(false);
  readonly isViewMode = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly searchText = signal('');
  readonly events = signal<CalendarEvent[]>([]);
  readonly lookups = signal<EventLookups | null>(null);
  readonly locationSuggestions = signal<LocationOption[]>([]);
  readonly selectedOrgIds = signal<number[]>([]);
  readonly currentEvent = signal<CalendarEvent | null>(null);

  readonly form = signal(this.emptyForm());

  readonly monthLabel = () => formatMonthLabel(this.viewYear(), this.viewMonth());
  readonly monthDays = () => buildMonthGrid(this.viewYear(), this.viewMonth());
  readonly canManage = computed(() => this.lookups()?.canManageEvents ?? false);
  readonly isCompleted = computed(() => this.form().status === 'पूर्ण झाले');
  readonly isLocked = computed(() => this.currentEvent()?.isLocked ?? false);
  readonly showReportingSection = computed(() => this.isCompleted() || this.isLocked());
  readonly canEditFields = computed(() => this.canManage() && !this.isViewMode() && !this.isLocked());
  readonly canEditReporting = computed(() => this.canManage() && !this.isViewMode() && (this.showReportingSection() || this.isLocked()));

  constructor() {
    this.calendarService.getLookups().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.lookups.set(data);
      if (data && !data.isSansthaUser && data.orgs.length === 1) {
        this.selectedOrgIds.set([data.orgs[0].orgID]);
      }
    });

    this.monthReload$
      .pipe(
        switchMap(() => {
          const { from, to } = monthRange(this.viewYear(), this.viewMonth());
          this.loading.set(true);
          return this.calendarService.getEvents(from, to, this.searchText());
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.events.set(data);
        this.loading.set(false);
      });

    this.locationSearch$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.loadLocationSuggestions(term));

    const pendingId = Number(this.route.snapshot.queryParamMap.get('pendingEventId'));
    if (pendingId > 0) this.openEventById(pendingId);

    this.destroyRef.onDestroy(() => this.monthReload$.complete());
    this.loadMonth();
  }

  prevMonth(): void { this.shiftMonth(-1); }
  nextMonth(): void { this.shiftMonth(1); }

  goToday(): void {
    const now = new Date();
    this.viewYear.set(now.getFullYear());
    this.viewMonth.set(now.getMonth());
    this.loadMonth();
  }

  onSearch(): void { this.loadMonth(); }

  openNew(dateIso?: string): void {
    if (!this.canManage()) return;
    this.resetModalState(false);
    const lookups = this.lookups();
    const orgIds = this.selectedOrgIds().length ? this.selectedOrgIds() : lookups?.orgs.slice(0, 1).map((o) => o.orgID) ?? [];
    this.selectedOrgIds.set(orgIds);
    this.form.set({
      ...this.emptyForm(),
      eventDate: dateIso ?? toIsoDate(new Date()),
      underOrgID: lookups?.sansthaOrgs[0] ?? lookups?.orgs[0]?.underOrgID ?? lookups?.orgs[0]?.orgID ?? null,
      orgIDs: orgIds
    });
    this.showModal.set(true);
  }

  editEvent(ev: CalendarEvent): void {
    this.openEventById(ev.eventID, !ev.canManage);
  }

  private openEventById(eventId: number, viewOnly = false): void {
    this.calendarService.getEvent(eventId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ev) => {
      if (!ev) return;
      this.resetModalState(viewOnly || !ev.canManage);
      this.currentEvent.set(ev);
      const orgIds = this.parseOrgIds(ev.orgIDs);
      this.selectedOrgIds.set(orgIds);
      this.form.set({
        eventID: ev.eventID,
        title: ev.title,
        description: ev.description ?? '',
        eventDate: ev.eventDate.slice(0, 10),
        startTime: ev.startTime ?? '',
        endTime: ev.endTime ?? '',
        isAllDay: ev.isAllDay,
        eventTypeID: ev.eventTypeID ?? null,
        locationID: ev.locationID ?? null,
        location: ev.location ?? '',
        color: ev.color ?? '',
        status: ev.status,
        notes: ev.notes ?? '',
        underOrgID: ev.underOrgID ?? this.lookups()?.sansthaOrgs[0] ?? null,
        orgIDs: orgIds,
        eventReporting: ev.eventReporting ?? '',
        eventPhotoAttachment: ev.eventPhotoAttachment ?? '',
        eventNewsAttachment: ev.eventNewsAttachment ?? ''
      });
      this.showModal.set(true);
    });
  }

  closeModal(): void { this.showModal.set(false); }

  saveEvent(): void {
    if (!this.canManage()) return;
    const f = this.form();
    const errors = validateEventForm({ title: f.title, location: f.location, orgIDs: f.orgIDs });
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);

    const payload: SaveEventRequest = {
      ...f,
      title: f.title.trim(),
      location: f.location.trim(),
      description: f.description || null,
      startTime: f.startTime || null,
      endTime: f.endTime || null,
      color: f.color || null,
      notes: f.notes || null,
      eventReporting: f.eventReporting || null,
      eventPhotoAttachment: f.eventPhotoAttachment || null,
      eventNewsAttachment: f.eventNewsAttachment || null
    };

    this.calendarService.saveEvent(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ data, message }) => {
      this.loading.set(false);
      if (!data) {
        const backendErrors = mapEventTicketBackendMessage(message);
        if (hasFieldErrors(backendErrors)) {
          this.fieldErrors.set(backendErrors);
        }
        this.saveError.set(message ?? 'Unable to save event.');
        toastOnSave(this.toast, false, { entity: 'Event', mode: f.eventID ? 'edit' : 'new', errorMessage: message ?? 'Unable to save event.' });
        return;
      }
      toastOnSave(this.toast, true, { entity: 'Event', mode: f.eventID ? 'edit' : 'new' });
      this.showModal.set(false);
      this.loadMonth();
    });
  }

  deleteCurrentEvent(): void {
    const id = this.form().eventID;
    if (!id || !this.canManage()) return;
    if (!confirm(`Delete event "${this.form().title}"?`)) return;
    this.calendarService.deleteEvent(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.showModal.set(false);
      this.loadMonth();
    });
  }

  toggleSchool(orgId: number, checked: boolean): void {
    if (!this.canEditFields()) return;
    this.selectedOrgIds.update((ids) => (checked ? [...new Set([...ids, orgId])] : ids.filter((id) => id !== orgId)));
    this.form.update((f) => ({ ...f, orgIDs: this.selectedOrgIds() }));
    this.fieldErrors.update((e) => removeFieldError(e, 'orgIDs'));
  }

  isSchoolSelected(orgId: number): boolean {
    return this.selectedOrgIds().includes(orgId);
  }

  onLocationInput(value: string): void {
    this.updateFormField('location', value);
    this.locationSearch$.next(value);
  }

  selectLocation(loc: LocationOption): void {
    this.form.update((f) => ({ ...f, location: loc.locationName, locationID: loc.locationID }));
    this.locationSuggestions.set([]);
  }

  onPhotoSelected(event: Event): void {
    this.uploadAttachment(event, 'eventPhotoAttachment');
  }

  onNewsSelected(event: Event): void {
    this.uploadAttachment(event, 'eventNewsAttachment');
  }

  eventsForDay(iso: string): CalendarEvent[] {
    return this.events().filter((e) => e.eventDate.slice(0, 10) === iso);
  }

  eventColor(ev: CalendarEvent): string {
    return ev.color || '#1976d2';
  }

  isToday(iso: string): boolean {
    return iso === toIsoDate(new Date());
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  updateFormField<K extends keyof ReturnType<typeof this.emptyForm>>(key: K, value: ReturnType<typeof this.emptyForm>[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  private shiftMonth(delta: number): void {
    let m = this.viewMonth() + delta;
    let y = this.viewYear();
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    this.viewMonth.set(m);
    this.viewYear.set(y);
    this.loadMonth();
  }

  private loadMonth(): void { this.monthReload$.next(); }

  private loadLocationSuggestions(term: string): void {
    const underOrgId = this.form().underOrgID ?? this.lookups()?.sansthaOrgs[0];
    if (!underOrgId || term.trim().length < 1) {
      this.locationSuggestions.set([]);
      return;
    }
    this.calendarService.searchLocations(underOrgId, term).subscribe((items) => this.locationSuggestions.set(items));
  }

  private uploadAttachment(event: Event, field: 'eventPhotoAttachment' | 'eventNewsAttachment'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.calendarService.uploadFile(file).subscribe((stored) => {
      if (!stored) {
        this.toast.showError('File upload failed.');
        return;
      }
      this.updateFormField(field, stored);
    });
  }

  private resetModalState(viewOnly: boolean): void {
    this.isViewMode.set(viewOnly);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.currentEvent.set(null);
    this.locationSuggestions.set([]);
  }

  private parseOrgIds(orgIds?: string | null): number[] {
    if (!orgIds) return [];
    return orgIds.split(',').map((x) => Number(x.trim())).filter((x) => x > 0);
  }

  private emptyForm() {
    return {
      eventID: null as number | null,
      title: '',
      description: '',
      eventDate: toIsoDate(new Date()),
      startTime: '',
      endTime: '',
      isAllDay: false,
      eventTypeID: null as number | null,
      locationID: null as number | null,
      location: '',
      color: '',
      status: 'नियोजित',
      notes: '',
      underOrgID: null as number | null,
      orgIDs: [] as number[],
      eventReporting: '',
      eventPhotoAttachment: '',
      eventNewsAttachment: ''
    };
  }
}
