import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AcademicCalendarService } from '../../core/services/academic-calendar.service';
import { Festival, Holiday } from '../../core/models/calendar.model';
import {
  buildMonthGrid,
  formatMonthLabel,
  HOLIDAY_TYPES,
  monthRange,
  toIsoDate
} from '../../core/constants/calendar.constants';
import { FieldErrors, hasFieldErrors, removeFieldError } from '../../core/utils/form-field-errors';
import { MarathiNumberInputDirective } from '../../core/directives/marathi-number-input.directive';
import { coerceEnglishIntegerString } from '../../core/utils/marathi-numerals';

type EntryType = 'holiday' | 'festival';

@Component({
  selector: 'app-academic-calendar',
  imports: [FormsModule, DatePipe, MarathiNumberInputDirective],
  templateUrl: './academic-calendar.component.html',
  styleUrl: './academic-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcademicCalendarComponent {
  private readonly calendarService = inject(AcademicCalendarService);
  private readonly destroyRef = inject(DestroyRef);

  readonly holidayTypes = HOLIDAY_TYPES;
  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  readonly loading = signal(false);
  readonly showModal = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly saveError = signal<string | null>(null);
  readonly entryType = signal<EntryType>('holiday');
  readonly holidays = signal<Holiday[]>([]);
  readonly festivals = signal<Festival[]>([]);

  readonly holidayForm = signal(this.emptyHolidayForm());
  readonly festivalForm = signal(this.emptyFestivalForm());

  readonly monthLabel = () => formatMonthLabel(this.viewYear(), this.viewMonth());
  readonly monthDays = () => buildMonthGrid(this.viewYear(), this.viewMonth());

  constructor() {
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

  openNew(type: EntryType, dateIso?: string): void {
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.entryType.set(type);
    const year = this.viewYear();
    const date = dateIso ?? toIsoDate(new Date(year, this.viewMonth(), 1));
    this.holidayForm.set({ ...this.emptyHolidayForm(), holidayDate: date, year });
    this.festivalForm.set({ ...this.emptyFestivalForm(), festivalDate: date, year });
    this.showModal.set(true);
  }

  editHoliday(item: Holiday): void {
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.entryType.set('holiday');
    this.holidayForm.set({
      holidayId: item.holidayId,
      holidayDate: item.holidayDate.slice(0, 10),
      nameMr: item.nameMr,
      nameEn: item.nameEn,
      holidayType: item.holidayType,
      color: item.color,
      year: item.year
    });
    this.showModal.set(true);
  }

  editFestival(item: Festival): void {
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.saveError.set(null);
    this.entryType.set('festival');
    this.festivalForm.set({
      festivalId: item.festivalId,
      festivalDate: item.festivalDate.slice(0, 10),
      nameMr: item.nameMr,
      nameEn: item.nameEn,
      color: item.color,
      year: item.year
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveEntry(): void {
    const errors: FieldErrors = {};
    if (this.entryType() === 'holiday') {
      if (!this.holidayForm().nameMr.trim()) {
        errors['nameMr'] = 'नाव (मराठी) आवश्यक आहे.';
      }
    } else if (!this.festivalForm().nameMr.trim()) {
      errors['nameMr'] = 'नाव (मराठी) आवश्यक आहे.';
    }
    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      this.saveError.set(null);
      return;
    }

    this.fieldErrors.set({});
    this.saveError.set(null);
    this.loading.set(true);

    if (this.entryType() === 'holiday') {
      const form = this.holidayForm();
      const year = +coerceEnglishIntegerString(String(form.year), 4) || form.year;
      const payload = { ...form, year, nameEn: form.nameMr.trim() };
      this.calendarService
        .saveHoliday(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((saved) => {
          this.loading.set(false);
          if (!saved) {
            this.saveError.set('Unable to save holiday.');
            return;
          }
          this.showModal.set(false);
          this.loadMonth();
        });
      return;
    }

    const form = this.festivalForm();
    const year = +coerceEnglishIntegerString(String(form.year), 4) || form.year;
    const payload = { ...form, year, nameEn: form.nameMr.trim() };
    this.calendarService
      .saveFestival(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.loading.set(false);
        if (!saved) {
          this.saveError.set('Unable to save festival.');
          return;
        }
        this.showModal.set(false);
        this.loadMonth();
      });
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  deleteHoliday(item: Holiday): void {
    if (!confirm(`"${item.nameMr}" सुट्टी हटवायची?`)) return;
    this.calendarService
      .deleteHoliday(item.holidayId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMonth());
  }

  deleteFestival(item: Festival): void {
    if (!confirm(`"${item.nameMr}" सण / उत्सव हटवायचा?`)) return;
    this.calendarService
      .deleteFestival(item.festivalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMonth());
  }

  holidaysForDay(iso: string): Holiday[] {
    return this.holidays().filter((h) => h.holidayDate.slice(0, 10) === iso);
  }

  festivalsForDay(iso: string): Festival[] {
    return this.festivals().filter((f) => f.festivalDate.slice(0, 10) === iso);
  }

  isToday(iso: string): boolean {
    return iso === toIsoDate(new Date());
  }

  private loadMonth(): void {
    const { from, to } = monthRange(this.viewYear(), this.viewMonth());
    this.loading.set(true);
    this.calendarService
      .getCalendar(from, to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.holidays.set(data.holidays);
        this.festivals.set(data.festivals);
        this.loading.set(false);
      });
  }

  private emptyHolidayForm() {
    const year = new Date().getFullYear();
    return {
      holidayId: null as number | null,
      holidayDate: toIsoDate(new Date()),
      nameMr: '',
      nameEn: '',
      holidayType: 'national',
      color: '#7b1fa2',
      year
    };
  }

  private emptyFestivalForm() {
    const year = new Date().getFullYear();
    return {
      festivalId: null as number | null,
      festivalDate: toIsoDate(new Date()),
      nameMr: '',
      nameEn: '',
      color: '#9c27b0',
      year
    };
  }

  updateHolidayField<K extends keyof ReturnType<typeof this.emptyHolidayForm>>(key: K, value: ReturnType<typeof this.emptyHolidayForm>[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.holidayForm.update((f) => ({ ...f, [key]: value }));
  }

  updateFestivalField<K extends keyof ReturnType<typeof this.emptyFestivalForm>>(key: K, value: ReturnType<typeof this.emptyFestivalForm>[K]): void {
    this.fieldErrors.update((e) => removeFieldError(e, String(key)));
    this.festivalForm.update((f) => ({ ...f, [key]: value }));
  }
}
