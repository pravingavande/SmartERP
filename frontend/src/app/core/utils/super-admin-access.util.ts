/** App Super Admin role in UserRoleMaster (seeded by 059 script). */
export const APP_SUPER_ADMIN_ROLE_ID = 5;

/** Sanstha Owner role — can add schools/employees under their Sanstha. */
export const SANSTHA_OWNER_ROLE_ID = 1;

export function isAppSuperAdmin(userRoleId?: number | null): boolean {
  return userRoleId === APP_SUPER_ADMIN_ROLE_ID;
}
