export type SortDirection = 'asc' | 'desc';

export function sortRows<T>(rows: T[], key: keyof T, direction: SortDirection): T[] {
  const sorted = [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
  });
  return direction === 'asc' ? sorted : sorted.reverse();
}

export function paginateRows<T>(rows: T[], pageIndex: number, pageSize: number): T[] {
  const start = pageIndex * pageSize;
  return rows.slice(start, start + pageSize);
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageRange(total: number, pageIndex: number, pageSize: number): { start: number; end: number } {
  if (!total) return { start: 0, end: 0 };
  return {
    start: pageIndex * pageSize + 1,
    end: Math.min(total, (pageIndex + 1) * pageSize)
  };
}

/** Missing isActive is treated as active (legacy rows). */
export function isMasterRecordActive(isActive?: boolean | null): boolean {
  return isActive !== false;
}

export function matchesMasterStatusFilter(isActive: boolean | undefined | null, showActive: boolean): boolean {
  const active = isMasterRecordActive(isActive);
  return showActive ? active : !active;
}

export function filterMasterListByStatus<T extends { isActive?: boolean | null }>(rows: T[], showActive: boolean): T[] {
  return rows.filter((row) => matchesMasterStatusFilter(row.isActive, showActive));
}
