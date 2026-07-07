import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AcademicCalendarData,
  ApiResponse,
  Festival,
  Holiday,
  SaveFestivalRequest,
  SaveHolidayRequest
} from '../models/calendar.model';

@Injectable({ providedIn: 'root' })
export class AcademicCalendarService {
  private readonly base = `${environment.apiBaseUrl}/academiccalendar`;

  constructor(private readonly http: HttpClient) {}

  getCalendar(from: string, to: string): Observable<AcademicCalendarData> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ApiResponse<AcademicCalendarData>>(this.base, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : { holidays: [], festivals: [] })),
      catchError(() => of({ holidays: [], festivals: [] }))
    );
  }

  saveHoliday(request: SaveHolidayRequest): Observable<Holiday | null> {
    return this.http.post<ApiResponse<Holiday>>(`${this.base}/holidays`, request).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  saveFestival(request: SaveFestivalRequest): Observable<Festival | null> {
    return this.http.post<ApiResponse<Festival>>(`${this.base}/festivals`, request).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  deleteHoliday(holidayId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/holidays/${holidayId}`).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }

  deleteFestival(festivalId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/festivals/${festivalId}`).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }
}
