/**
 * Teacher Master service-date helpers:
 * - leave year from DesignationMaster → Retirement Year
 * - working start + 12/24 years → month-end grade dates
 * - DOB + Retirement Year → month-end Retire Date
 */

/** Parse `YYYY-MM-DD` as a local calendar date (no UTC shift). */
export function parseIsoDateLocal(iso: string | null | undefined): Date | null {
  const value = (iso ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/** Format local date as `YYYY-MM-DD`. */
export function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Last calendar day of the month for the given date (e.g. 16 Jul → 31 Jul). */
export function lastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function lastDayOfMonthIso(iso: string | null | undefined): string | null {
  const date = parseIsoDateLocal(iso);
  if (!date) return null;
  return toIsoDateLocal(lastDayOfMonth(date));
}

/** Add whole years, then snap to the last day of that resulting month. */
export function addYearsThenMonthEndIso(iso: string | null | undefined, years: number): string | null {
  const date = parseIsoDateLocal(iso);
  if (!date || !Number.isFinite(years)) return null;
  const shifted = new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
  return toIsoDateLocal(lastDayOfMonth(shifted));
}

/** Retire Date = DOB + Retirement Year years → last day of that month. */
export function computeRetireDateIso(dobIso: string | null | undefined, retirementYear: number | null | undefined): string | null {
  if (retirementYear == null || Number.isNaN(retirementYear) || retirementYear < 0) return null;
  return addYearsThenMonthEndIso(dobIso, retirementYear);
}

/** 12 Year वरिष्ठ वेतनश्रेणी Date from Date of Working Start. */
export function computeSeniorGradeDateIso(workingStartIso: string | null | undefined): string | null {
  return addYearsThenMonthEndIso(workingStartIso, 12);
}

/** 24 Year निवडश्रेणी Date from Date of Working Start. */
export function computeSelectionGradeDateIso(workingStartIso: string | null | undefined): string | null {
  return addYearsThenMonthEndIso(workingStartIso, 24);
}
