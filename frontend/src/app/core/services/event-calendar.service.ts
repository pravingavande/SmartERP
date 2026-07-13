import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  CalendarEvent,
  EventLookups,
  EventType,
  LocationOption,
  PendingEventReportingSummary,
  SaveEventRequest,
  SaveEventTypeRequest
} from '../models/calendar.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class EventCalendarService {
  private readonly base = `${environment.apiBaseUrl}/eventcalendar`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getLookups(): Observable<EventLookups | null> {
    return this.http.get<ApiResponse<EventLookups>>(`${this.base}/lookups`).pipe(
      map((r) => {
        if (!r.success || !r.data) return null;
        return { ...r.data, orgs: this.auth.filterSchoolOrgs(r.data.orgs ?? []) };
      }),
      catchError(() => of(null))
    );
  }

  getEventTypes(underOrgId?: number | null): Observable<EventType[]> {
    let params = new HttpParams();
    if (underOrgId) params = params.set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<EventType[]>>(`${this.base}/event-types`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  saveEventType(request: SaveEventTypeRequest): Observable<{ data: EventType | null; message: string | null }> {
    return this.http.post<ApiResponse<EventType>>(`${this.base}/event-types`, request).pipe(
      map((r) => ({
        data: r.success && r.data ? r.data : null,
        message: r.success ? null : (r.message ?? 'Unable to save event type.')
      })),
      catchError(() => of({ data: null, message: 'Unable to save event type.' }))
    );
  }

  deleteEventType(eventTypeId: number): Observable<{ success: boolean; message: string | null }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/event-types/${eventTypeId}`).pipe(
      map((r) => ({
        success: r.success,
        message: r.success ? null : (r.message ?? 'Unable to delete event type.')
      })),
      catchError(() => of({ success: false, message: 'Unable to delete event type.' }))
    );
  }

  searchLocations(underOrgId: number, search?: string): Observable<LocationOption[]> {
    let params = new HttpParams().set('underOrgId', underOrgId.toString());
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<LocationOption[]>>(`${this.base}/locations`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getPendingReporting(): Observable<PendingEventReportingSummary> {
    return this.http.get<ApiResponse<PendingEventReportingSummary>>(`${this.base}/pending-reporting`).pipe(
      map((r) => r.success && r.data ? r.data : { pendingCount: 0, items: [] }),
      catchError(() => of({ pendingCount: 0, items: [] }))
    );
  }

  getEvents(from: string, to: string, search?: string): Observable<CalendarEvent[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (search?.trim()) params = params.set('search', search.trim());
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

  saveEvent(request: SaveEventRequest): Observable<{ data: CalendarEvent | null; message: string | null }> {
    return this.http.post<ApiResponse<CalendarEvent>>(`${this.base}/events`, request).pipe(
      map((r) => ({
        data: r.success && r.data ? r.data : null,
        message: r.success ? null : (r.message ?? 'Unable to save event.')
      })),
      catchError(() => of({ data: null, message: 'Unable to save event.' }))
    );
  }

  uploadFile(file: File): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<string>>(`${this.base}/upload`, formData).pipe(
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
