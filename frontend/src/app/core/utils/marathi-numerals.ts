/** Devanagari digits ०१२३४५६७८९ (U+0966–U+096F) used in Marathi typing. */
const DEVANAGARI_ZERO = 0x0966;

/** Convert Marathi / Devanagari numerals to English (0-9). */
export function toEnglishDigits(value: string): string {
  return value.replace(/[\u0966-\u096F]/g, (ch) => String(ch.charCodeAt(0) - DEVANAGARI_ZERO));
}

/** While typing: allow only Marathi + English digits (integer). */
export function filterIntegerTyping(value: string, maxLength?: number): string {
  const digits = (value.match(/[\u0966-\u096F0-9]/g) ?? []).join('');
  if (maxLength == null) return digits;
  let count = 0;
  let out = '';
  for (const ch of digits) {
    if (count >= maxLength) break;
    out += ch;
    count++;
  }
  return out;
}

/** While typing: allow Marathi + English digits and a single decimal point. */
export function filterDecimalTyping(value: string): string {
  const chars = value.match(/[\u0966-\u096F0-9.]/g) ?? [];
  let out = '';
  let hasDot = false;
  for (const ch of chars) {
    if (ch === '.') {
      if (hasDot) continue;
      hasDot = true;
    }
    out += ch;
  }
  return out;
}

/** On blur: English digits only (integer string). */
export function normalizeIntegerDigits(value: string, maxLength?: number): string {
  let s = toEnglishDigits(value).replace(/\D/g, '');
  if (maxLength != null) s = s.slice(0, maxLength);
  return s;
}

/** On blur: English digits with optional single decimal point. */
export function normalizeDecimalDigits(value: string): string {
  let s = toEnglishDigits(value).replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot >= 0) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  }
  return s;
}

export function parseDecimalValue(value: string): number {
  const s = normalizeDecimalDigits(value);
  if (!s || s === '.') return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function coerceEnglishIntegerString(value: unknown, maxLength?: number): string {
  if (value == null) return '';
  return normalizeIntegerDigits(String(value), maxLength);
}

export function coerceEnglishNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return parseDecimalValue(String(value ?? ''));
}

/** True if string contains any Marathi digit. */
export function hasMarathiDigits(value: string): boolean {
  return /[\u0966-\u096F]/.test(value);
}
