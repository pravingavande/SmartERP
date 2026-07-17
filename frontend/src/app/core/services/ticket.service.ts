import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  ReplyFormState,
  TicketDetail,
  TicketFormState,
  TicketListItem,
  TicketLookups,
  TicketPendingNotification,
  TicketStatusOption
} from '../models/ticket.model';
import { AuthService } from './auth.service';
import { encodeRelativeStoragePath } from '../utils/local-file-url.util';

const FALLBACK_STATUSES: TicketStatusOption[] = [
  { ticketStatusID: 1, statusName: 'Open', statusNameMr: 'खुले', sortOrder: 1 },
  { ticketStatusID: 2, statusName: 'Waiting for Reply', statusNameMr: 'प्रत्युत्तराची वाट', sortOrder: 2 },
  { ticketStatusID: 3, statusName: 'Replied', statusNameMr: 'उत्तर दिले', sortOrder: 3 },
  { ticketStatusID: 4, statusName: 'Closed', statusNameMr: 'बंद', sortOrder: 4 }
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
      switchMap((data) => (data ? of(data) : this.fetchLookups(`${this.donationBase}/ticket-lookups`))),
      switchMap((data) => (data ? of(data) : this.buildFallbackLookups()))
    );
  }

  getPendingNotifications(): Observable<TicketPendingNotification[]> {
    return this.http
      .get<ApiResponse<TicketPendingNotification[]>>(`${this.ticketBase}/pending-notifications`)
      .pipe(
        map((r) => (r.success && r.data ? r.data : [])),
        catchError(() => of([]))
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

  getById(ticketId: number): Observable<TicketDetail | null> {
    return this.http.get<ApiResponse<TicketDetail>>(`${this.ticketBase}/${ticketId}`).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() =>
        this.http
          .get<ApiResponse<TicketDetail>>(`${this.donationBase}/tickets/${ticketId}`)
          .pipe(map((r) => (r.success && r.data ? r.data : null)))
      ),
      catchError(() => of(null))
    );
  }

  save(form: TicketFormState): Observable<{ data: TicketDetail | null; message: string | null }> {
    const payload = {
      ticketID: form.ticketID,
      orgIDs: form.orgIDs,
      ticketDate: form.ticketDate,
      subject: form.subject?.trim() || null,
      description: form.description?.trim() || null,
      module: form.module?.trim() || null,
      priority: form.priority || null,
      replyRequired: form.replyRequired || null,
      attachment: form.attachment || null
    };

    return this.http.post<ApiResponse<TicketDetail>>(`${this.ticketBase}`, payload).pipe(
      map((r) => ({
        data: r.success && r.data ? r.data : null,
        message: r.success ? null : (r.message ?? 'Unable to save ticket. Check required fields and permissions.')
      })),
      catchError(() =>
        this.http
          .post<ApiResponse<TicketDetail>>(`${this.donationBase}/tickets`, payload)
          .pipe(map((r) => ({
            data: r.success && r.data ? r.data : null,
            message: r.success ? null : (r.message ?? 'Unable to save ticket.')
          })))
      ),
      catchError(() => of({ data: null, message: 'Unable to save ticket.' }))
    );
  }

  addReply(ticketId: number, form: ReplyFormState): Observable<TicketDetail | null> {
    const payload = {
      ticketID: ticketId,
      replyText: form.replyText.trim(),
      replyStatus: form.replyStatus?.trim() || null,
      attachment: form.attachment || null
    };

    return this.http.post<ApiResponse<TicketDetail>>(`${this.ticketBase}/reply`, payload).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  acknowledge(ticketId: number): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.ticketBase}/${ticketId}/acknowledge`, {}).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }

  close(ticketId: number): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.ticketBase}/${ticketId}/close`, {}).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }

  uploadFile(file: File, orgId: number): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.post<ApiResponse<string>>(`${this.ticketBase}/upload`, formData, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  fileUrl(fileName: string): string {
    return `${this.ticketBase}/file/${encodeRelativeStoragePath(fileName)}`;
  }

  downloadFile(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
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
          orgs: this.auth.filterSchoolOrgs(r.data.orgs ?? []),
          priorities: r.data.priorities ?? ['Low', 'Medium', 'High', 'Critical'],
          replyRequiredOptions: r.data.replyRequiredOptions ?? ['Instant', 'Later'],
          modules: r.data.modules ?? [],
          canRaiseTicket: r.data.canRaiseTicket ?? r.data.isSansthaUser,
          userID: r.data.userID ?? 0
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
          modules: [],
          priorities: ['Low', 'Medium', 'High', 'Critical'],
          replyRequiredOptions: ['Instant', 'Later'],
          isSansthaUser: r.data.orgs.length > 1,
          canRaiseTicket: r.data.orgs.length > 1,
          userID: 0
        } satisfies TicketLookups;
      }),
      catchError(() => of(null))
    );
  }
}
