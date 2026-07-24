/** True when notice event date is today or in the future (date-only comparison). */
export function isUpcomingNoticeDate(noticeDate: string | null | undefined, today = new Date()): boolean {
  if (!noticeDate?.trim()) return false;
  const event = new Date(noticeDate);
  if (Number.isNaN(event.getTime())) return false;

  const eventDay = new Date(event.getFullYear(), event.getMonth(), event.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return eventDay.getTime() >= todayDay.getTime();
}
