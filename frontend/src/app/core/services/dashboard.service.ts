import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import { DashboardSummary, NoticeItem, UserProfile } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<UserProfile | null> {
    return this.http
      .get<ApiResponse<UserProfile>>(`${environment.apiBaseUrl}/auth/me`)
      .pipe(
        map((r) => (r.success && r.data ? r.data : null)),
        catchError(() => of(null))
      );
  }

  getSummary(): Observable<DashboardSummary | null> {
    return this.http
      .get<ApiResponse<DashboardSummary>>(`${environment.apiBaseUrl}/dashboard/summary`)
      .pipe(
        map((r) => (r.success && r.data ? r.data : null)),
        catchError(() => of(null))
      );
  }

  getNotices(count = 10): Observable<NoticeItem[]> {
    return this.http
      .get<ApiResponse<NoticeItem[]>>(`${environment.apiBaseUrl}/dashboard/notices`, {
        params: { count: count.toString() }
      })
      .pipe(
        map((r) => (r.success && r.data ? r.data : [])),
        catchError(() => of([]))
      );
  }
}
