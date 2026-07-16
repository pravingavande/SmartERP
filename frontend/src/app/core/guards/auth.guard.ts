import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { canAccessAdminMasters } from '../utils/master-access.util';
import { isAppSuperAdmin } from '../utils/super-admin-access.util';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

/** Restricts admin-only master screens to UserRoleID 1 (Super Admin) or 2 (Administrator). */
export const adminMasterGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const userRoleId = auth.currentUser()?.userRoleId;

  if (canAccessAdminMasters(userRoleId)) {
    return true;
  }

  toast.showError('You do not have permission to access this master.', 'Access Denied');
  const routePath = route.routeConfig?.path ?? '';
  const fallback = routePath.startsWith('stock/') ? '/stock/dashboard' : '/audit/masters';
  return router.createUrlTree([fallback]);
};

/** Restricts App Super Admin screens to UserRoleID 5. */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (isAppSuperAdmin(auth.currentUser()?.userRoleId)) {
    return true;
  }

  toast.showError('Only App Super Admin can access this screen.', 'Access Denied');
  return router.createUrlTree(['/dashboard']);
};
