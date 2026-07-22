/** Local calendar date as `YYYY-MM-DD` for `<input type="date">`. */
export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Compare calendar dates from ISO strings or `Date` values. */
export function isSameCalendarDay(
  dateA: string | Date | null | undefined,
  dateB: string | Date | null | undefined
): boolean {
  if (!dateA || !dateB) return false;
  const toIso = (value: string | Date): string =>
    typeof value === 'string' ? value.slice(0, 10) : todayIsoDateFromDate(value);
  return toIso(dateA) === toIso(dateB);
}

function todayIsoDateFromDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
