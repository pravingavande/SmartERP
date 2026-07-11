import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Ticket,
  TicketFormState,
  TicketListItem,
  TicketLookups,
  TicketStatusOption
} from '../models/ticket.model';
import { coerceEnglishNumber } from '../utils/marathi-numerals';
import { AuthService } from './auth.service';

/** Matches dbo.TicketStatusMaster seed IDs when ticket API is unavailable. */
const FALLBACK_STATUSES: TicketStatusOption[] = [
  { ticketStatusID: 1, statusName: 'Pending', statusNameMr: 'प्रलंबित', sortOrder: 1 },
  { ticketStatusID: 2, statusName: 'In Progress', statusNameMr: 'प्रगतीत', sortOrder: 2 },
  { ticketStatusID: 3, statusName: 'Completed', statusNameMr: 'पूर्ण', sortOrder: 3 },
  { ticketStatusID: 4, statusName: 'Cancelled', statusNameMr: 'रद्द', sortOrder: 4 }
];

interface DonationLookupsShape {
  orgs: TicketLookups['orgs'];
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly ticketBase = `${environment.apiBaseUrl}/ticket`;
  private readonly donationBase = `${environment.apiBaseUrl}/donation`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getLookups(): Observable<TicketLookups | null> {
    return this.fetchLookups(`${this.ticketBase}/lookups`).pipe(
      switchMap((data) =>
        data ? of(data) : this.fetchLookups(`${this.donationBase}/ticket-lookups`)
      ),
      switchMap((data) => (data ? of(data) : this.buildFallbackLookups()))
    );
  }

  getList(orgId?: number | null): Observable<TicketListItem[]> {
    let params = new HttpParams();
    if (orgId) params = params.set('orgId', orgId.toString());

    return this.fetchList(this.ticketBase, params).pipe(
      catchError(() => this.fetchList(`${this.donationBase}/tickets`, params)),
      catchError(() => of([]))
    );
  }

  getById(ticketId: number): Observable<Ticket | null> {
    return this.http.get<ApiResponse<Ticket>>(`${this.ticketBase}/${ticketId}`).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() =>
        this.http
          .get<ApiResponse<Ticket>>(`${this.donationBase}/tickets/${ticketId}`)
          .pipe(map((r) => (r.success && r.data ? r.data : null)))
      ),
      catchError(() => of(null))
    );
  }

  save(form: TicketFormState): Observable<Ticket | null> {
    const payload = {
      ticketID: form.ticketID,
      orgID: form.orgID,
      ticketDate: form.ticketDate,
      description: form.description || null,
      amount: coerceEnglishNumber(form.amount),
      ticketStatusID: form.ticketStatusID,
      attachment: form.attachment || null
    };

    return this.http.post<ApiResponse<Ticket>>(`${this.ticketBase}`, payload).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() =>
        this.http
          .post<ApiResponse<Ticket>>(`${this.donationBase}/tickets`, payload)
          .pipe(map((r) => (r.success && r.data ? r.data : null)))
      ),
      catchError(() => of(null))
    );
  }

  delete(ticketId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.ticketBase}/${ticketId}`).pipe(
      map((r) => r.success),
      catchError(() =>
        this.http
          .delete<ApiResponse<boolean>>(`${this.donationBase}/tickets/${ticketId}`)
          .pipe(map((r) => r.success))
      ),
      catchError(() => of(false))
    );
  }

  private fetchLookups(url: string): Observable<TicketLookups | null> {
    return this.http.get<ApiResponse<TicketLookups>>(url).pipe(
      map((r) => {
        if (!r.success || !r.data) return null;
        return {
          ...r.data,
          orgs: this.auth.filterSchoolOrgs(r.data.orgs ?? [])
        };
      }),
      catchError(() => of(null))
    );
  }

  private fetchList(url: string, params: HttpParams): Observable<TicketListItem[]> {
    return this.http.get<ApiResponse<TicketListItem[]>>(url, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : []))
    );
  }

  private buildFallbackLookups(): Observable<TicketLookups | null> {
    return this.http.get<ApiResponse<DonationLookupsShape>>(`${this.donationBase}/lookups`).pipe(
      map((r) => {
        if (!r.success || !r.data?.orgs?.length) return null;
        return {
          orgs: this.auth.filterSchoolOrgs(r.data.orgs),
          statuses: FALLBACK_STATUSES,
          isSansthaUser: r.data.orgs.length > 1
        } satisfies TicketLookups;
      }),
      catchError(() => of(null))
    );
  }
}
