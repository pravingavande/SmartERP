export type FieldErrors = Record<string, string>;

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function removeFieldError(errors: FieldErrors, key: string): FieldErrors {
  if (!errors[key]) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
}

export function detailFieldKey(index: number, field: string): string {
  return `detail-${index}-${field}`;
}
