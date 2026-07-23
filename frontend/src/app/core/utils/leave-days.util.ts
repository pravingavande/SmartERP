/** Compute leave days from date range; supports half-day (0.5) on a single date. */
export function calcLeaveNoOfDays(
  fromDate: string,
  toDate: string,
  isHalfDay = false
): number | null {
  if (!fromDate || !toDate) return null;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return null;

  if (isHalfDay) {
    if (fromDate !== toDate) return null;
    return 0.5;
  }

  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86400000) + 1;
}

export function isHalfDayLeave(noOfDay: number | null | undefined): boolean {
  return noOfDay != null && Math.abs(noOfDay - 0.5) < 0.001;
}
