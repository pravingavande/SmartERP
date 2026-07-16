import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, tap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import { apiData, apiSuccess } from '../utils/api-response.util';

export type SoftwareLanguageCode = 'M' | 'E';

interface SoftwareLanguageRow {
  srNo?: number;
  underOrgID?: number | null;
  title?: string;
  condition?: string;
  description?: string;
}

interface LanguageKeyRow {
  id?: number;
  keyName?: string;
  keyValueMR?: string;
  keyValueEN?: string;
  KeyName?: string;
  KeyValueMR?: string;
  KeyValueEN?: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly http = inject(HttpClient);
  /** Under master (avoids IIS/path issues with /settings). */
  private readonly base = `${environment.apiBaseUrl}/master`;

  private readonly languageSignal = signal<SoftwareLanguageCode>('E');
  private readonly keysSignal = signal<Record<string, { mr: string; en: string }>>({});
  private readonly loadedSignal = signal(false);

  readonly language = this.languageSignal.asReadonly();
  readonly isMarathi = computed(() => this.languageSignal() === 'M');
  readonly loaded = this.loadedSignal.asReadonly();

  /** Resolve label by LanguageKeyValueMaster.KeyName. Falls back to English key text, then fallback. */
  label(keyName: string, fallback?: string): string {
    const row = this.keysSignal()[keyName];
    if (!row) return fallback ?? keyName;
    return this.languageSignal() === 'M' ? (row.mr || row.en || fallback || keyName) : (row.en || row.mr || fallback || keyName);
  }

  load(underOrgID: number): Observable<void> {
    if (!underOrgID || underOrgID <= 0) {
      this.loadedSignal.set(true);
      return of(void 0);
    }

    return forkJoin({
      lang: this.http.get<ApiResponse<SoftwareLanguageRow>>(`${this.base}/software-language`, {
        params: { underOrgID: String(underOrgID) }
      }),
      keys: this.http.get<ApiResponse<LanguageKeyRow[]>>(`${this.base}/language-keys`)
    }).pipe(
      tap(({ lang, keys }) => {
        const langData = apiSuccess(lang) ? apiData(lang) : null;
        if (langData) {
          const c = (langData.condition ?? 'E').toUpperCase();
          this.languageSignal.set(c === 'M' ? 'M' : 'E');
        }
        const keyRows = apiSuccess(keys) ? apiData(keys) : null;
        if (keyRows) {
          const mapKeys: Record<string, { mr: string; en: string }> = {};
          for (const row of keyRows) {
            const name = (row.keyName ?? row.KeyName ?? '').trim();
            if (!name) continue;
            mapKeys[name] = {
              mr: (row.keyValueMR ?? row.KeyValueMR ?? '').trim(),
              en: (row.keyValueEN ?? row.KeyValueEN ?? '').trim()
            };
          }
          this.keysSignal.set(mapKeys);
        }
        this.loadedSignal.set(true);
      }),
      map(() => void 0),
      catchError(() => {
        this.loadedSignal.set(true);
        return of(void 0);
      })
    );
  }

  getLanguage(underOrgID: number): Observable<SoftwareLanguageCode> {
    return this.http
      .get<ApiResponse<SoftwareLanguageRow>>(`${this.base}/software-language`, {
        params: { underOrgID: String(underOrgID) }
      })
      .pipe(
        map((r) => {
          const c = (apiSuccess(r) && apiData(r)?.condition ? apiData(r)!.condition! : 'E').toUpperCase();
          const code: SoftwareLanguageCode = c === 'M' ? 'M' : 'E';
          this.languageSignal.set(code);
          return code;
        }),
        catchError(() => of<SoftwareLanguageCode>('E'))
      );
  }

  saveLanguage(underOrgID: number, condition: SoftwareLanguageCode): Observable<{ ok: boolean; message?: string }> {
    return this.http
      .post<ApiResponse<SoftwareLanguageRow>>(`${this.base}/software-language`, { underOrgID, condition })
      .pipe(
        map((r) => {
          if (apiSuccess(r)) {
            this.languageSignal.set(condition);
            return { ok: true, message: r.message };
          }
          return { ok: false, message: r.message || 'Unable to save language setting.' };
        }),
        catchError((err) => {
          const status = err?.status;
          const msg = status === 404
            ? 'Language API not found on server. Please redeploy the latest API and restart IIS.'
            : 'Unable to save language setting.';
          return of({ ok: false, message: msg });
        })
      );
  }
}
