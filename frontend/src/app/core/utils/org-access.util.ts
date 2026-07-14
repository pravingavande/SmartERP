import { AuthUser } from '../models/auth.model';

export interface SchoolOrgOption {
  orgID: number;
}

/** UserRoleID 1 or 2 = sanstha-scoped admin (all schools in OrgGroupID from API). */
export function isSansthaAdminUser(userRoleId?: number | null): boolean {
  return userRoleId === 1 || userRoleId === 2;
}

/** @deprecated Use isSansthaAdminUser — kept for callers that mean sanstha admin, not global all-schools. */
export function canSeeAllSchools(userRoleId?: number | null): boolean {
  return isSansthaAdminUser(userRoleId);
}

/**
 * School org dropdown filter.
 * UserRole 1/2: API returns schools for user's Sanstha (OrgGroupID) — pass through.
 * UserRole 3: only schools mapped in login schoolContexts.
 */
export function filterSchoolOrgs<T extends SchoolOrgOption>(orgs: T[], user: AuthUser | null): T[] {
  if (!orgs.length || !user) return orgs;

  if (user.userRoleId === 3) {
    const allowed = new Set<number>();
    for (const ctx of user.schoolContexts ?? []) {
      if (ctx.schoolId) allowed.add(ctx.schoolId);
    }
    if (user.schoolId) allowed.add(user.schoolId);
    if (allowed.size === 0) return orgs;
    return orgs.filter((o) => allowed.has(o.orgID));
  }

  return orgs;
}
