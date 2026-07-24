import { isUpcomingNoticeDate } from './notice-date.util';

describe('isUpcomingNoticeDate', () => {
  const today = new Date(2026, 6, 23); // 23 Jul 2026

  it('returns true for today', () => {
    expect(isUpcomingNoticeDate('2026-07-23', today)).toBeTrue();
  });

  it('returns true for future dates', () => {
    expect(isUpcomingNoticeDate('2026-07-25', today)).toBeTrue();
  });

  it('returns false for past dates', () => {
    expect(isUpcomingNoticeDate('2026-07-20', today)).toBeFalse();
  });

  it('returns false for empty values', () => {
    expect(isUpcomingNoticeDate('', today)).toBeFalse();
    expect(isUpcomingNoticeDate(null, today)).toBeFalse();
  });
});
