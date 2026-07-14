import {
  ADMIN_ONLY_MASTER_ROUTE_PATHS,
  canAccessAdminMasters,
  isAdminOnlyMasterRoute
} from './master-access.util';

describe('master-access.util', () => {
  describe('canAccessAdminMasters', () => {
    it('allows Super Admin and Administrator', () => {
      expect(canAccessAdminMasters(1)).toBe(true);
      expect(canAccessAdminMasters(2)).toBe(true);
    });

    it('denies other user roles', () => {
      expect(canAccessAdminMasters(3)).toBe(false);
      expect(canAccessAdminMasters(0)).toBe(false);
      expect(canAccessAdminMasters(null)).toBe(false);
      expect(canAccessAdminMasters(undefined)).toBe(false);
    });
  });

  describe('isAdminOnlyMasterRoute', () => {
    it('matches all restricted master routes', () => {
      for (const route of ADMIN_ONLY_MASTER_ROUTE_PATHS) {
        expect(isAdminOnlyMasterRoute(route)).toBe(true);
        expect(isAdminOnlyMasterRoute(`/${route}`)).toBe(true);
      }
    });

    it('does not match unrestricted masters', () => {
      expect(isAdminOnlyMasterRoute('audit/party-master')).toBe(false);
      expect(isAdminOnlyMasterRoute('audit/academic-schedule')).toBe(false);
      expect(isAdminOnlyMasterRoute('stock/register')).toBe(false);
    });

    it('matches stock item master routes', () => {
      expect(isAdminOnlyMasterRoute('stock/item-master')).toBe(true);
      expect(isAdminOnlyMasterRoute('stock/item-group-master')).toBe(true);
    });
  });
});
