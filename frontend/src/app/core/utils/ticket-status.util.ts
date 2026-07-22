/** Detect UTF-8 Marathi stored/read as Latin-1 (e.g. à¤–à¥à¤²à¥‡ instead of खुले). */
export function looksLikeMojibake(text: string): boolean {
  return /[ÃÂà¤]/.test(text);
}

export function ticketStatusLabel(item: {
  statusName?: string | null;
  statusNameMr?: string | null;
  preferMarathi?: boolean;
}): string {
  const en = item.statusName?.trim();
  const mr = item.statusNameMr?.trim();
  if (item.preferMarathi && mr && !looksLikeMojibake(mr)) return mr;
  if (en) return en;
  if (mr && !looksLikeMojibake(mr)) return mr;
  return '—';
}
