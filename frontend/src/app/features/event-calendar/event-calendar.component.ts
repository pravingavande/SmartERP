import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, forkJoin, switchMap } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { EventCalendarService } from '../../core/services/event-calendar.service';
import { ToastService } from '../../core/services/toast.service';
import { CalendarEvent, EventLookups, LocationOption, SaveEventRequest } from '../../core/models/calendar.model';
import { resolveDefaultSchoolOrgId } from '../../core/utils/org-access.util';
import {
  buildMonthGrid,
  buildWeekDays,
  CalendarViewMode,
  dayRange,
  EVENT_STATUSES,
  formatDayLabel,
  formatMonthLabel,
  formatWeekLabel,
  monthRange,
  toIsoDate,
  weekRange
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
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly monthReload$ = new Subject<void>();
  private readonly locationSearch$ = new Subject<string>();

  readonly statuses = EVENT_STATUSES;
  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly viewMode = signal<CalendarViewMode>('month');
  readonly viewDate = signal(new Date());
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
  readonly schoolPickerOpen = signal(false);

  readonly form = signal(this.emptyForm());

  readonly monthLabel = () => formatMonthLabel(this.viewYear(), this.viewMonth());
  readonly periodLabel = computed(() => {
    const mode = this.viewMode();
    const date = this.viewDate();
    if (mode === 'today') return formatDayLabel(date);
    if (mode === 'week') return formatWeekLabel(date);
    return formatMonthLabel(this.viewYear(), this.viewMonth());
  });
  readonly monthDays = () => buildMonthGrid(this.viewYear(), this.viewMonth());
  readonly weekDaysGrid = computed(() => buildWeekDays(this.viewDate()));
  readonly todayIso = computed(() => toIsoDate(this.viewDate()));
  readonly canManage = computed(() => this.lookups()?.canManageEvents ?? false);
  readonly isSingleSchoolUser = computed(() => {
    const lookups = this.lookups();
    return !!lookups && !lookups.isSansthaUser && lookups.orgs.length === 1;
  });
  readonly schoolSelectionSummary = computed(() => {
    const ids = this.selectedOrgIds();
    const orgs = this.lookups()?.orgs ?? [];
    if (!ids.length) return 'Select school(s)...';
    const names = orgs.filter((o) => ids.includes(o.orgID)).map((o) => o.organizationName);
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(', ');
    return `${names.length} schools selected`;
  });
  readonly selectedSchoolNames = computed(() => {
    const ids = new Set(this.selectedOrgIds());
    return (this.lookups()?.orgs ?? []).filter((o) => ids.has(o.orgID)).map((o) => o.organizationName);
  });
  readonly singleSchoolDisplayName = computed(() => {
    const names = this.selectedSchoolNames();
    if (names.length) return names[0];
    const orgs = this.lookups()?.orgs ?? [];
    return orgs[0]?.organizationName ?? '—';
  });
  readonly isCompleted = computed(() => this.form().status === 'पूर्ण झाले');
  readonly isLocked = computed(() => this.currentEvent()?.isLocked ?? false);
  readonly showReportingSection = computed(() => this.isCompleted() || this.isLocked());
  readonly canEditFields = computed(() => this.canManage() && !this.isViewMode() && !this.isLocked());
  readonly canEditReporting = computed(() => this.canManage() && !this.isViewMode() && (this.showReportingSection() || this.isLocked()));

  constructor() {
    forkJoin({
      lookups: this.calendarService.getLookups(),
      profile: this.dashboardService.getProfile()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups: data, profile }) => {
        this.lookups.set(data);
        if (!data?.orgs?.length) return;
        const defaultOrgId = resolveDefaultSchoolOrgId(data.orgs, profile);
        if (defaultOrgId) {
          this.selectedOrgIds.set([defaultOrgId]);
        }
      });

    this.monthReload$
      .pipe(
        switchMap(() => {
          const range = this.activeRange();
          this.loading.set(true);
          return this.calendarService.getEvents(range.from, range.to, this.searchText());
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
    this.loadEvents();
  }

  prevPeriod(): void {
    const mode = this.viewMode();
    if (mode === 'month') this.shiftMonth(-1);
    else if (mode === 'week') this.shiftDays(-7);
    else this.shiftDays(-1);
  }

  nextPeriod(): void {
    const mode = this.viewMode();
    if (mode === 'month') this.shiftMonth(1);
    else if (mode === 'week') this.shiftDays(7);
    else this.shiftDays(1);
  }

  setViewMode(mode: CalendarViewMode): void {
    this.viewMode.set(mode);
    const now = new Date();
    if (mode === 'month') {
      this.viewYear.set(now.getFullYear());
      this.viewMonth.set(now.getMonth());
      this.viewDate.set(now);
    } else {
      this.viewDate.set(now);
      this.viewYear.set(now.getFullYear());
      this.viewMonth.set(now.getMonth());
    }
    this.loadEvents();
  }

  goToday(): void {
    const now = new Date();
    this.viewYear.set(now.getFullYear());
    this.viewMonth.set(now.getMonth());
    this.viewDate.set(now);
    this.loadEvents();
  }

  onSearch(): void { this.loadEvents(); }

  openNew(dateIso?: string): void {
    if (!this.canManage()) return;
    this.resetModalState(false);
    const lookups = this.lookups();
    const fallbackOrgId = resolveDefaultSchoolOrgId(lookups?.orgs ?? [], null);
    const orgIds = this.selectedOrgIds().length
      ? this.selectedOrgIds()
      : fallbackOrgId
        ? [fallbackOrgId]
        : [];
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
      this.loadEvents();
    });
  }

  deleteCurrentEvent(): void {
    const id = this.form().eventID;
    if (!id || !this.canManage()) return;
    if (!confirm(`Delete event "${this.form().title}"?`)) return;
    this.calendarService.deleteEvent(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.showModal.set(false);
      this.loadEvents();
    });
  }

  toggleSchool(orgId: number, checked: boolean): void {
    if (!this.canEditFields()) return;
    this.selectedOrgIds.update((ids) => (checked ? [...new Set([...ids, orgId])] : ids.filter((id) => id !== orgId)));
    this.form.update((f) => ({ ...f, orgIDs: this.selectedOrgIds() }));
    this.fieldErrors.update((e) => removeFieldError(e, 'orgIDs'));
  }

  toggleSchoolPicker(event: Event): void {
    event.stopPropagation();
    if (!this.canEditFields() || this.isSingleSchoolUser()) return;
    this.schoolPickerOpen.update((open) => !open);
  }

  selectAllSchools(): void {
    if (!this.canEditFields()) return;
    const orgIds = (this.lookups()?.orgs ?? []).map((o) => o.orgID);
    this.selectedOrgIds.set(orgIds);
    this.form.update((f) => ({ ...f, orgIDs: orgIds }));
    this.fieldErrors.update((e) => removeFieldError(e, 'orgIDs'));
  }

  clearSchools(): void {
    if (!this.canEditFields()) return;
    this.selectedOrgIds.set([]);
    this.form.update((f) => ({ ...f, orgIDs: [] }));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.schoolPickerOpen()) return;
    const target = event.target as HTMLElement;
    if (target.closest('.school-multiselect')) return;
    this.schoolPickerOpen.set(false);
  }

  closeSchoolPicker(event?: Event): void {
    event?.stopPropagation();
    this.schoolPickerOpen.set(false);
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

  openAttachment(fileName: string): void {
    if (!fileName?.trim()) return;
    const url = this.calendarService.fileUrl(fileName);
    this.calendarService.downloadFile(url).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => this.toast.showError('Unable to open file.')
    });
  }

  private activeRange(): { from: string; to: string } {
    const mode = this.viewMode();
    if (mode === 'today') return dayRange(this.viewDate());
    if (mode === 'week') return weekRange(this.viewDate());
    return monthRange(this.viewYear(), this.viewMonth());
  }

  private shiftDays(delta: number): void {
    const next = new Date(this.viewDate());
    next.setDate(next.getDate() + delta);
    this.viewDate.set(next);
    this.viewYear.set(next.getFullYear());
    this.viewMonth.set(next.getMonth());
    this.loadEvents();
  }

  private shiftMonth(delta: number): void {
    let m = this.viewMonth() + delta;
    let y = this.viewYear();
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    this.viewMonth.set(m);
    this.viewYear.set(y);
    this.viewDate.set(new Date(y, m, 1));
    this.loadEvents();
  }

  private loadEvents(): void { this.monthReload$.next(); }

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
    const orgId = this.selectedOrgIds()[0] ?? this.form().underOrgID;
    if (!orgId) {
      this.toast.showError('Please select at least one school before uploading a file.');
      return;
    }
    this.calendarService.uploadFile(file, orgId).subscribe((stored) => {
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
    this.schoolPickerOpen.set(false);
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
