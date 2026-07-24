/** Parse API date strings for stable sorting (ISO, date-only, empty). */
export function parseSortableDate(value: string | null | undefined): number {
  if (!value?.trim()) return 0;
  const direct = new Date(value).getTime();
  if (!Number.isNaN(direct)) return direct;

  const dateOnly = new Date(`${value.slice(0, 10)}T00:00:00`).getTime();
  return Number.isNaN(dateOnly) ? 0 : dateOnly;
}

export function compareCreatedDateDesc(
  a: { createdDate: string; documentUploadID?: number },
  b: { createdDate: string; documentUploadID?: number }
): number {
  const byDate = parseSortableDate(b.createdDate) - parseSortableDate(a.createdDate);
  if (byDate !== 0) return byDate;
  return (b.documentUploadID ?? 0) - (a.documentUploadID ?? 0);
}
