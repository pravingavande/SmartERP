import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
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
import { OrgOption } from '../models/audit.model';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class EventCalendarService {
  private readonly base = `${environment.apiBaseUrl}/eventcalendar`;
  private readonly audit = inject(AuditService);

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getLookups(): Observable<EventLookups | null> {
    return this.http.get<ApiResponse<EventLookups>>(`${this.base}/lookups`).pipe(
      map((r) => (r.success && r.data ? this.normalizeLookups(r.data) : null)),
      switchMap((data) => (data ? of(data) : this.buildLookupsFromAudit())),
      catchError(() => this.buildLookupsFromAudit())
    );
  }

  getEventTypes(underOrgId?: number | null): Observable<EventType[]> {
    let params = new HttpParams();
    if (underOrgId) params = params.set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<EventType[]>>(`${this.base}/event-types`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeEventType(x)) : [])),
      catchError(() => of([]))
    );
  }

  saveEventType(request: SaveEventTypeRequest): Observable<{ data: EventType | null; message: string | null }> {
    return this.http.post<ApiResponse<EventType>>(`${this.base}/event-types`, request).pipe(
      map((r) => ({
        data: r.success && r.data ? this.normalizeEventType(r.data) : null,
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

  private buildLookupsFromAudit(): Observable<EventLookups | null> {
    return this.audit.getLookups().pipe(
      map((audit) => {
        if (!audit?.orgs?.length) return null;
        const orgs = audit.orgs.map((o) => this.normalizeOrg(o));
        const sansthaOrgs = this.deriveSansthaOrgIds(orgs, audit.sansthaOrgs);
        return {
          eventTypes: [],
          orgs,
          sansthaOrgs,
          canManageEvents: this.defaultCanManageEvents(),
          isSansthaUser: orgs.length > 1
        } satisfies EventLookups;
      }),
      catchError(() => of(null))
    );
  }

  private normalizeLookups(raw: unknown): EventLookups {
    const data = raw as Record<string, unknown>;
    const orgs = ((data['orgs'] ?? data['Orgs']) as OrgOption[] | undefined)?.map((o) => this.normalizeOrg(o)) ?? [];
    const filteredOrgs = this.auth.filterSchoolOrgs(orgs);
    const rawSanstha = (data['sansthaOrgs'] ?? data['SansthaOrgs']) as number[] | OrgOption[] | undefined;
    const sansthaFromApi = Array.isArray(rawSanstha)
      ? rawSanstha.map((x) => (typeof x === 'number' ? x : Number((x as OrgOption).orgID ?? (x as { OrgID?: number }).OrgID ?? 0))).filter((x) => x > 0)
      : [];
    const eventTypes = ((data['eventTypes'] ?? data['EventTypes']) as unknown[] | undefined)?.map((x) => this.normalizeEventType(x)) ?? [];

    return {
      eventTypes,
      orgs: filteredOrgs,
      sansthaOrgs: sansthaFromApi.length ? sansthaFromApi : this.deriveSansthaOrgIds(filteredOrgs),
      canManageEvents: Boolean(data['canManageEvents'] ?? data['CanManageEvents'] ?? this.defaultCanManageEvents()),
      isSansthaUser: Boolean(data['isSansthaUser'] ?? data['IsSansthaUser'] ?? filteredOrgs.length > 1)
    };
  }

  private normalizeOrg(raw: OrgOption & { OrgID?: number; OrganizationName?: string; SchoolCode?: number | null; UnderOrgID?: number | null }): OrgOption {
    return {
      orgID: Number(raw.orgID ?? raw.OrgID ?? 0),
      organizationName: String(raw.organizationName ?? raw.OrganizationName ?? ''),
      schoolCode: raw.schoolCode ?? raw.SchoolCode ?? null,
      underOrgID: raw.underOrgID ?? raw.UnderOrgID ?? null
    };
  }

  private normalizeEventType(raw: unknown): EventType {
    const r = raw as EventType & {
      EventTypeID?: number;
      UnderOrgID?: number;
      SrNo?: number;
      EventType?: string;
      IsActive?: boolean;
      UnderOrgName?: string | null;
    };
    return {
      eventTypeID: Number(r.eventTypeID ?? r.EventTypeID ?? 0),
      underOrgID: Number(r.underOrgID ?? r.UnderOrgID ?? 0),
      srNo: Number(r.srNo ?? r.SrNo ?? 0),
      eventType: String(r.eventType ?? r.EventType ?? ''),
      isActive: Boolean(r.isActive ?? r.IsActive ?? true),
      underOrgName: (r.underOrgName ?? r.UnderOrgName) as string | null | undefined
    };
  }

  private deriveSansthaOrgIds(orgs: OrgOption[], sansthaOrgOptions: OrgOption[] = []): number[] {
    const ids = sansthaOrgOptions.map((o) => o.orgID).filter((id) => id > 0);
    if (ids.length) return [...new Set(ids)];

    const derived = orgs
      .filter((o) => o.orgID === o.underOrgID || o.underOrgID == null)
      .map((o) => o.orgID)
      .filter((id) => id > 0);
    if (derived.length) return [...new Set(derived)];

    return orgs.length ? [orgs[0].orgID] : [];
  }

  private defaultCanManageEvents(): boolean {
    const userRoleId = this.auth.currentUser()?.userRoleId;
    return userRoleId === 1 || userRoleId === 2 || userRoleId === 3;
  }
}
