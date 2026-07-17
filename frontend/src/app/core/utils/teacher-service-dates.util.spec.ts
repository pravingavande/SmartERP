import {
  addYearsThenMonthEndIso,
  computeRetireDateIso,
  computeSelectionGradeDateIso,
  computeSeniorGradeDateIso,
  lastDayOfMonthIso,
  parseIsoDateLocal,
  toIsoDateLocal
} from './teacher-service-dates.util';

describe('teacher-service-dates.util', () => {
  it('parses and formats local ISO dates', () => {
    const d = parseIsoDateLocal('2050-07-16');
    expect(d).toBeTruthy();
    expect(toIsoDateLocal(d!)).toBe('2050-07-16');
  });

  it('returns last day of month', () => {
    expect(lastDayOfMonthIso('2050-07-16')).toBe('2050-07-31');
    expect(lastDayOfMonthIso('2024-02-10')).toBe('2024-02-29');
    expect(lastDayOfMonthIso('2025-02-10')).toBe('2025-02-28');
    expect(lastDayOfMonthIso('2025-04-01')).toBe('2025-04-30');
  });

  it('adds years then snaps to month end', () => {
    expect(addYearsThenMonthEndIso('2010-06-15', 12)).toBe('2022-06-30');
    expect(addYearsThenMonthEndIso('2010-06-15', 24)).toBe('2034-06-30');
  });

  it('computes senior and selection grade dates from working start', () => {
    expect(computeSeniorGradeDateIso('2010-07-16')).toBe('2022-07-31');
    expect(computeSelectionGradeDateIso('2010-07-16')).toBe('2034-07-31');
  });

  it('computes retire date from DOB + retirement years', () => {
    expect(computeRetireDateIso('1980-07-16', 70)).toBe('2050-07-31');
    expect(computeRetireDateIso('1980-07-16', null)).toBeNull();
    expect(computeRetireDateIso('', 70)).toBeNull();
  });
});
