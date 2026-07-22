import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import { apiData, apiSuccess } from '../utils/api-response.util';

export interface AuditEntryDaysSetting {
  underOrgID: number;
  newEntryNoOfPreviousDayAllowed: number;
  editEntryNoOfPreviousDayAllowed: number;
}

interface AuditEntryDaysRow {
  underOrgID?: number;
  newEntryNoOfPreviousDayAllowed?: number;
  editEntryNoOfPreviousDayAllowed?: number;
  UnderOrgID?: number;
  NewEntryNoOfPreviousDayAllowed?: number;
  EditEntryNoOfPreviousDayAllowed?: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  /** Under master (same pattern as LanguageService). */
  private readonly base = `${environment.apiBaseUrl}/master`;

  getAuditEntryDays(underOrgID: number): Observable<AuditEntryDaysSetting> {
    return this.http
      .get<ApiResponse<AuditEntryDaysRow>>(`${this.base}/audit-entry-days`, {
        params: { underOrgID: String(underOrgID) }
      })
      .pipe(
        map((r) => this.normalizeAuditEntryDays(underOrgID, apiSuccess(r) ? apiData(r) : null)),
        catchError(() =>
          of({
            underOrgID,
            newEntryNoOfPreviousDayAllowed: 0,
            editEntryNoOfPreviousDayAllowed: 0
          })
        )
      );
  }

  saveAuditEntryDays(
    underOrgID: number,
    newEntryNoOfPreviousDayAllowed: number,
    editEntryNoOfPreviousDayAllowed: number
  ): Observable<{ ok: boolean; message?: string; data?: AuditEntryDaysSetting }> {
    return this.http
      .post<ApiResponse<AuditEntryDaysRow>>(`${this.base}/audit-entry-days`, {
        underOrgID,
        newEntryNoOfPreviousDayAllowed,
        editEntryNoOfPreviousDayAllowed
      })
      .pipe(
        map((r) => {
          if (apiSuccess(r)) {
            return {
              ok: true,
              message: r.message,
              data: this.normalizeAuditEntryDays(underOrgID, apiData(r))
            };
          }
          return { ok: false, message: r.message || 'Unable to save audit entry day settings.' };
        }),
        catchError(() => of({ ok: false, message: 'Unable to save audit entry day settings.' }))
      );
  }

  private normalizeAuditEntryDays(
    underOrgID: number,
    row: AuditEntryDaysRow | null | undefined
  ): AuditEntryDaysSetting {
    return {
      underOrgID: row?.underOrgID ?? row?.UnderOrgID ?? underOrgID,
      newEntryNoOfPreviousDayAllowed: this.toNonNegativeInt(
        row?.newEntryNoOfPreviousDayAllowed ?? row?.NewEntryNoOfPreviousDayAllowed
      ),
      editEntryNoOfPreviousDayAllowed: this.toNonNegativeInt(
        row?.editEntryNoOfPreviousDayAllowed ?? row?.EditEntryNoOfPreviousDayAllowed
      )
    };
  }

  private toNonNegativeInt(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }
}
