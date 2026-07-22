import { AuthUser } from '../models/auth.model';

export interface SchoolOrgOption {
  orgID: number;
}

/** Org option shape used by Org / School dropdown + default selection. */
export interface SchoolOrgSelectOption extends SchoolOrgOption {
  organizationName: string;
  schoolCode?: number | null;
  underOrgID?: number | null;
}

export interface SchoolOrgProfileHint {
  schoolCode?: number | null;
  orgId?: number | null;
  SchoolCode?: number | null;
  orgID?: number | null;
  sansthaId?: number | null;
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

/**
 * Sanstha org list for masters scoped by UnderOrgID (Account Register, Document, etc.).
 * Falls back to login session when API returns no sanstha orgs.
 */
export function resolveSansthaOrgs(
  fromApi: SchoolOrgSelectOption[],
  user: AuthUser | null
): SchoolOrgSelectOption[] {
  if (fromApi.length) return fromApi;

  const orgs: SchoolOrgSelectOption[] = [];

  for (const ctx of user?.schoolContexts ?? []) {
    if (!ctx.sansthaId || !ctx.sansthaName) continue;
    if (!orgs.some((o) => o.orgID === ctx.sansthaId)) {
      orgs.push({
        orgID: ctx.sansthaId,
        organizationName: ctx.sansthaName,
        schoolCode: ctx.sansthaId
      });
    }
  }

  if (!orgs.length && user?.sansthaId && user.sansthaName) {
    orgs.push({
      orgID: user.sansthaId,
      organizationName: user.sansthaName,
      schoolCode: user.sansthaId
    });
  }

  return orgs;
}

/**
 * Default Sanstha selection — same rules as Account Register Master:
 * 1) session sansthaId  2) profile orgId  3) first available sanstha.
 */
export function resolveDefaultSansthaOrgId(
  orgs: SchoolOrgSelectOption[],
  profile?: SchoolOrgProfileHint | null,
  user?: AuthUser | null
): number | null {
  if (!orgs.length) return null;

  if (user?.sansthaId) {
    const match = orgs.find((o) => o.orgID === user.sansthaId);
    if (match) return match.orgID;
  }

  const profileOrgId = profile?.orgId ?? profile?.orgID ?? null;
  if (profileOrgId) {
    const match = orgs.find((o) => o.orgID === profileOrgId);
    if (match) return match.orgID;
  }

  return orgs[0]?.orgID ?? null;
}

/**
 * Default Org / School selection — same rules as Receipt/Payment Voucher:
 * 1) profile schoolCode  2) profile orgId  3) first available org.
 */
export function resolveDefaultSchoolOrgId(
  orgs: SchoolOrgSelectOption[],
  profile?: SchoolOrgProfileHint | null
): number | null {
  if (!orgs.length) return null;

  const schoolCode = profile?.schoolCode ?? profile?.SchoolCode ?? null;
  if (schoolCode) {
    const match = orgs.find((o) => o.schoolCode === schoolCode);
    if (match) return match.orgID;
  }

  const profileOrgId = profile?.orgId ?? profile?.orgID ?? null;
  if (profileOrgId) {
    const match = orgs.find((o) => o.orgID === profileOrgId);
    if (match) return match.orgID;
  }

  return orgs[0]?.orgID ?? null;
}
