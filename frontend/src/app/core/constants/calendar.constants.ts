import type { CalendarDay } from '../models/calendar.model';

export const EVENT_STATUSES = [
  { value: 'नियोजित', label: 'नियोजित (Planned)' },
  { value: 'पूर्ण झाले', label: 'पूर्ण झाले (Completed)' },
  { value: 'रद्द झाले', label: 'रद्द झाले (Cancelled)' }
] as const;

export const HOLIDAY_TYPES = [
  { value: 'national', label: 'National' },
  { value: 'state', label: 'State' },
  { value: 'public', label: 'Public' }
] as const;

export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const days: CalendarDay[] = [];
  const cursor = new Date(start);

  for (let i = 0; i < 42; i++) {
    days.push({
      date: new Date(cursor),
      inMonth: cursor.getMonth() === month,
      iso: toIsoDate(cursor)
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = toIsoDate(new Date(year, month, 1));
  const to = toIsoDate(new Date(year, month + 1, 0));
  return { from, to };
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export type CalendarViewMode = 'today' | 'week' | 'month';

export function dayRange(date: Date): { from: string; to: string } {
  const iso = toIsoDate(date);
  return { from: iso, to: iso };
}

export function weekRange(date: Date): { from: string; to: string } {
  const start = new Date(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

export function buildWeekDays(date: Date): CalendarDay[] {
  const start = new Date(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days: CalendarDay[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 7; i++) {
    days.push({
      date: new Date(cursor),
      inMonth: true,
      iso: toIsoDate(cursor)
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function formatWeekLabel(date: Date): string {
  const { from, to } = weekRange(date);
  const start = new Date(from);
  const end = new Date(to);
  const startLabel = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
