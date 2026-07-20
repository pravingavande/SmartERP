/** Import popup language filter: Marathi (Devanagari) vs English (Latin). */
export type ImportLanguage = 'M' | 'E';

const DEVANAGARI = /[\u0900-\u097F]/;

export function matchesImportLanguage(name: string | null | undefined, lang: ImportLanguage): boolean {
  const text = (name ?? '').trim();
  if (!text) return false;
  const isMarathi = DEVANAGARI.test(text);
  return lang === 'M' ? isMarathi : !isMarathi;
}
