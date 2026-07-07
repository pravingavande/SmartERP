import type { CalendarDay } from '../models/calendar.model';

export const EVENT_PRIORITIES = [
  { value: 'उच्च', label: 'उच्च (High)', color: '#c62828' },
  { value: 'मध्यम', label: 'मध्यम (Medium)', color: '#f57c00' },
  { value: 'निम्न', label: 'निम्न (Low)', color: '#43a047' }
] as const;

export const EVENT_STATUSES = [
  { value: 'नियोजित', label: 'नियोजित' },
  { value: 'पूर्ण', label: 'पूर्ण झाले' },
  { value: 'रद्द', label: 'रद्द' },
  { value: 'पुढे ढकललेले', label: 'पुढे ढकललेले' }
] as const;

export const HOLIDAY_TYPES = [
  { value: 'national', label: 'National' },
  { value: 'state', label: 'State' },
  { value: 'public', label: 'Public' }
] as const;

export const LOCATION_OPTIONS = [
  'School Campus',
  'Sanstha Office',
  'Assembly Hall',
  'Playground',
  'Online',
  'Other'
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
