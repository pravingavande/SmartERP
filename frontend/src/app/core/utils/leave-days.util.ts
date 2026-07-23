/** Inclusive calendar days between two ISO date strings (yyyy-MM-dd). */
export function calcInclusiveCalendarDays(fromDate: string, toDate: string): number | null {
  if (!fromDate || !toDate) return null;
  const from = parseIsoDate(fromDate);
  const to = parseIsoDate(toDate);
  if (!from || !to || to < from) return null;
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86400000) + 1;
}

/**
 * Compute leave days from date range.
 * Full days = inclusive calendar span; half-day subtracts 0.5 from the total.
 * Examples: 23–23 + half = 0.5; 23–24 + half = 1.5; 23–24 full = 2.
 */
export function calcLeaveNoOfDays(
  fromDate: string,
  toDate: string,
  isHalfDay = false
): number | null {
  const inclusiveDays = calcInclusiveCalendarDays(fromDate, toDate);
  if (inclusiveDays == null) return null;

  const total = inclusiveDays - (isHalfDay ? 0.5 : 0);
  return total > 0 ? total : null;
}

/** True when stored day count has a half-day fraction (0.5, 1.5, 2.5, …). */
export function isHalfDayLeave(noOfDay: number | null | undefined): boolean {
  if (noOfDay == null) return false;
  const fractional = Math.abs(noOfDay - Math.trunc(noOfDay));
  return Math.abs(fractional - 0.5) < 0.001;
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}
