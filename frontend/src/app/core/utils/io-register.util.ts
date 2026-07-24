import { YearIoOption } from '../models/io-register.model';

/** Default IO year: API active year, else flagged active, else current calendar year, else first. */
export function resolveDefaultIoYear(years: YearIoOption[], activeYear?: YearIoOption | null): YearIoOption | null {
  if (!years.length) return null;
  if (activeYear?.yioID) return activeYear;

  const flaggedActive = years.find((y) => y.isActive);
  if (flaggedActive) return flaggedActive;

  const currentYear = String(new Date().getFullYear());
  const calendarMatch = years.find(
    (y) => y.yearName === currentYear || y.yearName?.startsWith(`${currentYear}-`) || y.yearName?.startsWith(currentYear)
  );
  if (calendarMatch) return calendarMatch;

  return years[0] ?? null;
}
