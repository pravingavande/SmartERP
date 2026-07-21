/** UserRoleID 1 = Super Admin, 2 = Administrator */
export const ADMIN_MASTER_USER_ROLE_IDS = [1, 2] as const;

/** Masters visible only to Super Admin and Administrator. */
export const ADMIN_ONLY_MASTER_ROUTE_PATHS = [
  'audit/ledger-head-master',
  'audit/account-register-master',
  'audit/account-register-define',
  'audit/donation-head-master',
  'audit/leave-type-master',
  'audit/class-master',
  'audit/document-master',
  'audit/category-master',
  'audit/event-types-master',
  'audit/subject-master',
  'stock/item-group-master',
  'stock/item-master'
] as const;

export function canAccessAdminMasters(userRoleId?: number | null): boolean {
  return userRoleId === 1 || userRoleId === 2;
}

export function isAdminOnlyMasterRoute(path: string): boolean {
  const normalized = path.replace(/^\//, '');
  return (ADMIN_ONLY_MASTER_ROUTE_PATHS as readonly string[]).includes(normalized);
}
