/**
 * Builds full employee/teacher display name from name parts.
 * Mirrors database EmployeeName logic (First + Middle + Last).
 */
export function buildEmployeeName(
  firstname: string | null | undefined,
  middleName: string | null | undefined,
  lastName: string | null | undefined
): string {
  return [firstname, middleName, lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim();
}

/**
 * Trims employee short name for save payload; empty becomes ''.
 */
export function normalizeEmployeeShortName(value: string | null | undefined): string {
  return value?.trim() ?? '';
}
