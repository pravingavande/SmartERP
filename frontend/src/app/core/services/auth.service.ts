import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthUser, LoginRequest, LoginResponse } from '../models/auth.model';

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

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
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
    this.userSignal.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.userSignal()?.token ?? null;
  }

  private persistUser(data: LoginResponse): void {
    const user: AuthUser = {
      userId: data.userId,
      userName: data.userName,
      displayName: data.displayName,
      roleCode: data.roleCode,
      token: data.token,
      expiresAt: data.expiresAt
    };
    this.userSignal.set(user);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private readStoredUser(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthUser;
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
