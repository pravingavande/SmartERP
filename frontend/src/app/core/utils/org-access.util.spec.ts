import { AuthUser } from '../models/auth.model';
import { resolveDefaultSansthaOrgId, resolveSansthaOrgs } from './org-access.util';

describe('org-access.util sanstha', () => {
  const sansthaOrgs = [
    { orgID: 1, organizationName: 'LR Tech & PathSoft', schoolCode: 1 },
    { orgID: 5, organizationName: 'Other Sanstha', schoolCode: 5 }
  ];

  it('resolveSansthaOrgs returns API list when present', () => {
    expect(resolveSansthaOrgs(sansthaOrgs, null)).toEqual(sansthaOrgs);
  });

  it('resolveSansthaOrgs falls back to session sanstha', () => {
    const user = {
      sansthaId: 9,
      sansthaName: 'Session Sanstha',
      schoolContexts: [{ sansthaId: 9, sansthaName: 'Session Sanstha' }]
    } as AuthUser;

    const orgs = resolveSansthaOrgs([], user);
    expect(orgs).toEqual([{ orgID: 9, organizationName: 'Session Sanstha', schoolCode: 9 }]);
  });

  it('resolveDefaultSansthaOrgId prefers session sansthaId', () => {
    const user = { sansthaId: 5 } as AuthUser;
    expect(resolveDefaultSansthaOrgId(sansthaOrgs, { orgId: 1 }, user)).toBe(5);
  });

  it('resolveDefaultSansthaOrgId falls back to profile orgId', () => {
    expect(resolveDefaultSansthaOrgId(sansthaOrgs, { orgId: 1 }, null)).toBe(1);
  });

  it('resolveDefaultSansthaOrgId falls back to first org', () => {
    expect(resolveDefaultSansthaOrgId(sansthaOrgs, null, null)).toBe(1);
  });
});
