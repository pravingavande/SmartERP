import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthUser, LoginRequest, LoginResponse, UserLoginSchoolContext } from '../models/auth.model';
import { filterSchoolOrgs } from '../utils/org-access.util';
import { ToastService } from './toast.service';

const STORAGE_KEY = 'smartepr_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<AuthUser | null>(this.readStoredUser());

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => {
    const user = this.userSignal();
    if (!user) return false;
    return new Date(user.expiresAt) > new Date();
  });

  readonly isSansthaAdmin = computed(() => {
    const userTypeId = this.userSignal()?.userTypeId;
    return userTypeId === 1 || userTypeId === 2;
  });

  /** @deprecated Use isSansthaAdmin — sanstha-scoped admin, not global all-schools. */
  readonly canSeeAllSchools = this.isSansthaAdmin;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly toast: ToastService
  ) {}

  login(request: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiBaseUrl}/auth/login`, request)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.persistUser(response.data);
          }
        }),
        catchError(() =>
          of({ success: false, message: 'Unable to connect to server.' })
        )
      );
  }

  logout(): void {
    this.toast.dismissAll();
    this.userSignal.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.userSignal()?.token ?? null;
  }

  filterSchoolOrgs<T extends { orgID: number }>(orgs: T[]): T[] {
    return filterSchoolOrgs(orgs, this.userSignal());
  }

  private persistUser(data: LoginResponse): void {
    const user: AuthUser = {
      userId: data.userId,
      userName: data.userName,
      displayName: data.displayName,
      roleCode: data.roleCode,
      token: data.token,
      expiresAt: data.expiresAt,
      schoolId: data.schoolId,
      sansthaId: data.sansthaId,
      schoolName: data.schoolName,
      sansthaName: data.sansthaName,
      userTypeId: data.userTypeId,
      userTypeName: data.userTypeName,
      schoolContexts: data.schoolContexts
    };
    this.userSignal.set(user);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private readStoredUser(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthUser & {
        orgId?: number;
        orgGroupId?: number;
        organizationName?: string;
        organizationGroupName?: string;
        orgContexts?: UserLoginSchoolContext[];
        userTypeID?: number;
        userTypeName?: string;
      };
      const user: AuthUser = {
        userId: parsed.userId,
        userName: parsed.userName,
        displayName: parsed.displayName,
        roleCode: parsed.roleCode,
        token: parsed.token,
        expiresAt: parsed.expiresAt,
        schoolId: parsed.schoolId ?? parsed.orgId,
        sansthaId: parsed.sansthaId ?? parsed.orgGroupId,
        schoolName: parsed.schoolName ?? parsed.organizationName,
        sansthaName: parsed.sansthaName ?? parsed.organizationGroupName,
        userTypeId: parsed.userTypeId ?? parsed.userTypeID,
        userTypeName: parsed.userTypeName,
        schoolContexts: parsed.schoolContexts ?? parsed.orgContexts
      };
      if (new Date(user.expiresAt) <= new Date()) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return user;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
