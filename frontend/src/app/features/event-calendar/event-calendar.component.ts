import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EventCalendarService } from '../../core/services/event-calendar.service';
import { CalendarEvent, EventType } from '../../core/models/calendar.model';
import {
  buildMonthGrid,
  EVENT_PRIORITIES,
  EVENT_STATUSES,
  formatMonthLabel,
  LOCATION_OPTIONS,
  monthRange,
  toIsoDate
} from '../../core/constants/calendar.constants';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../core/utils/form-field-errors';

@Component({
  selector: 'app-event-calendar',
  imports: [FormsModule, DatePipe],
  templateUrl: './event-calendar.component.html',
  styleUrl: './event-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventCalendarComponent {
  private readonly calendarService = inject(EventCalendarService);
  private readonly destroyRef = inject(DestroyRef);

  readonly priorities = EVENT_PRIORITIES;
  readonly statuses = EVENT_STATUSES;
  readonly locationOptions = LOCATION_OPTIONS;
  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  readonly loading = signal(false);
  readonly showModal = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly searchText = signal('');
  readonly events = signal<CalendarEvent[]>([]);
  readonly eventTypes = signal<EventType[]>([]);

  readonly form = signal(this.emptyForm());

  readonly monthLabel = () => formatMonthLabel(this.viewYear(), this.viewMonth());
  readonly monthDays = () => buildMonthGrid(this.viewYear(), this.viewMonth());

  constructor() {
    this.calendarService
      .getEventTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((types) => this.eventTypes.set(types));
    this.loadMonth();
  }

  prevMonth(): void {
    const m = this.viewMonth();
    const y = this.viewYear();
    if (m === 0) {
      this.viewMonth.set(11);
      this.viewYear.set(y - 1);
    } else {
      this.viewMonth.set(m - 1);
    }
    this.loadMonth();
  }

  nextMonth(): void {
    const m = this.viewMonth();
    const y = this.viewYear();
    if (m === 11) {
      this.viewMonth.set(0);
      this.viewYear.set(y + 1);
    } else {
      this.viewMonth.set(m + 1);
    }
    this.loadMonth();
  }

  goToday(): void {
    const now = new Date();
    this.viewYear.set(now.getFullYear());
    this.viewMonth.set(now.getMonth());
    this.loadMonth();
  }

  onSearch(): void {
    this.loadMonth();
  }

  openNew(dateIso?: string): void {
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      ...this.emptyForm(),
      eventDate: dateIso ?? toIsoDate(new Date())
    });
    this.showModal.set(true);
  }

  editEvent(ev: CalendarEvent): void {
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.form.set({
      eventId: ev.eventId,
      title: ev.title,
      description: ev.description ?? '',
      eventDate: ev.eventDate.slice(0, 10),
      startTime: ev.startTime ?? '',
      endTime: ev.endTime ?? '',
      isAllDay: ev.isAllDay,
      eventTypeId: ev.eventTypeId ?? null,
      priority: ev.priority,
      location: ev.location ?? '',
      organizerName: ev.organizerName ?? '',
      color: ev.color ?? '',
      status: ev.status,
      notes: ev.notes ?? ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveEvent(): void {
    const f = this.form();
    const errors: FieldErrors = {};
    if (!f.title.trim()) {
      errors['title'] = 'Title is required.';
    }
    if (!f.location.trim()) {
      errors['location'] = 'Location is required.';
    }
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.saveError.set(null);

    this.calendarService
      .saveEvent({
        ...f,
        title: f.title.trim(),
        location: f.location.trim(),
        description: f.description || null,
        startTime: f.startTime || null,
        endTime: f.endTime || null,
        color: f.color || null,
        notes: f.notes || null
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('Unable to save event.');
          return;
        }
        this.showModal.set(false);
        this.loadMonth();
      });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  deleteCurrentEvent(): void {
    const id = this.form().eventId;
    if (!id) return;
    const title = this.form().title;
    if (!confirm(`Delete event "${title}"?`)) return;
    this.calendarService
      .deleteEvent(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.showModal.set(false);
        this.loadMonth();
      });
  }

  deleteEvent(ev: CalendarEvent): void {
    if (!confirm(`Delete event "${ev.title}"?`)) return;
    this.calendarService
      .deleteEvent(ev.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMonth());
  }

  eventsForDay(iso: string): CalendarEvent[] {
    return this.events().filter((e) => e.eventDate.slice(0, 10) === iso);
  }

  eventColor(ev: CalendarEvent): string {
    if (ev.color) return ev.color;
    if (ev.priority === 'उच्च') return '#c62828';
    if (ev.priority === 'निम्न') return '#43a047';
    return ev.eventTypeColor ?? '#1976d2';
  }

  isToday(iso: string): boolean {
    return iso === toIsoDate(new Date());
  }

  updateFormField<K extends keyof ReturnType<typeof this.emptyForm>>(key: K, value: ReturnType<typeof this.emptyForm>[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  private loadMonth(): void {
    const { from, to } = monthRange(this.viewYear(), this.viewMonth());
    this.loading.set(true);
    this.calendarService
      .getEvents(from, to, this.searchText())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.events.set(data);
        this.loading.set(false);
      });
  }

  private emptyForm() {
    return {
      eventId: null as number | null,
      title: '',
      description: '',
      eventDate: toIsoDate(new Date()),
      startTime: '',
      endTime: '',
      isAllDay: false,
      eventTypeId: null as number | null,
      priority: 'मध्यम',
      location: '',
      organizerName: '',
      color: '',
      status: 'नियोजित',
      notes: ''
    };
  }
}
