import { calcLeaveNoOfDays } from './leave-days.util';

describe('calcLeaveNoOfDays', () => {
  it('returns 0.5 for same-day half-day leave', () => {
    expect(calcLeaveNoOfDays('2026-07-23', '2026-07-23', true)).toBe(0.5);
  });

  it('returns 1.5 for two-day range with half-day', () => {
    expect(calcLeaveNoOfDays('2026-07-23', '2026-07-24', true)).toBe(1.5);
  });

  it('returns 2 for two-day range without half-day', () => {
    expect(calcLeaveNoOfDays('2026-07-23', '2026-07-24', false)).toBe(2);
  });

  it('returns null when to date is before from date', () => {
    expect(calcLeaveNoOfDays('2026-07-24', '2026-07-23', false)).toBeNull();
  });
});
