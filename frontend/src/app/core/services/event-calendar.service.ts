import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CalendarEvent, EventType, SaveEventRequest } from '../models/calendar.model';

@Injectable({ providedIn: 'root' })
export class EventCalendarService {
  private readonly base = `${environment.apiBaseUrl}/eventcalendar`;

  constructor(private readonly http: HttpClient) {}

  getEventTypes(): Observable<EventType[]> {
    return this.http.get<ApiResponse<EventType[]>>(`${this.base}/event-types`).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getEvents(from: string, to: string, search?: string): Observable<CalendarEvent[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<CalendarEvent[]>>(`${this.base}/events`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getEvent(eventId: number): Observable<CalendarEvent | null> {
    return this.http.get<ApiResponse<CalendarEvent>>(`${this.base}/events/${eventId}`).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  saveEvent(request: SaveEventRequest): Observable<CalendarEvent | null> {
    return this.http.post<ApiResponse<CalendarEvent>>(`${this.base}/events`, request).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  deleteEvent(eventId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/events/${eventId}`).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }
}
