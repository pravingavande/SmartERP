import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiResponse } from '../models/master.model';
import { DocumentUploadFormState, DocumentUploadItem } from '../models/document-upload.model';
import { environment } from '../../../environments/environment';
import { encodeRelativeStoragePath } from '../utils/local-file-url.util';

@Injectable({ providedIn: 'root' })
export class DocumentUploadService {
  private readonly base = `${environment.apiBaseUrl}/document-upload`;

  constructor(private readonly http: HttpClient) {}

  getList(orgId: number): Observable<DocumentUploadItem[]> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<DocumentUploadItem[]>>(this.base, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalize(x as unknown as Record<string, unknown>)) : [])),
      catchError(() => of([]))
    );
  }

  getNextSrNo(orgId: number): Observable<number> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<{ nextSrNo: number }>>(`${this.base}/next-srno`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.nextSrNo ?? 1 : 1)),
      catchError(() => of(1))
    );
  }

  save(form: DocumentUploadFormState): Observable<{ data: DocumentUploadItem | null; message?: string }> {
    const payload = {
      documentUploadID: form.documentUploadID ?? 0,
      orgID: form.orgID,
      srNo: form.srNo,
      tDate: form.tDate,
      documentTitle: form.documentTitle.trim(),
      documentPath: form.documentPath?.trim() || null
    };
    return this.http.post<ApiResponse<DocumentUploadItem>>(this.base, payload).pipe(
      map((r) => ({
        data: r.success && r.data ? this.normalize(r.data as unknown as Record<string, unknown>) : null,
        message: r.message ?? undefined
      })),
      catchError(() => of({ data: null, message: 'Unable to save document.' }))
    );
  }

  delete(documentUploadId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/${documentUploadId}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message ?? undefined })),
      catchError(() => of({ success: false, message: 'Unable to delete document.' }))
    );
  }

  upload(file: File, orgId: number): Observable<{ path: string | null; message?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.post<ApiResponse<string>>(`${this.base}/upload`, formData, { params }).pipe(
      map((r) => ({ path: r.success && r.data ? r.data : null, message: r.message ?? undefined })),
      catchError(() => of({ path: null, message: 'Unable to upload file.' }))
    );
  }

  fileUrl(relativePath: string): string {
    return `${this.base}/file/${encodeRelativeStoragePath(relativePath)}`;
  }

  downloadFile(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  private normalize(raw: Record<string, unknown>): DocumentUploadItem {
    const tDateRaw = raw['tDate'] ?? raw['TDate'];
    const tDate = typeof tDateRaw === 'string' ? tDateRaw.slice(0, 10) : '';
    const underOrgRaw = raw['underOrgID'] ?? raw['UnderOrgID'];
    return {
      documentUploadID: Number(raw['documentUploadID'] ?? raw['DocumentUploadID'] ?? 0),
      orgID: Number(raw['orgID'] ?? raw['OrgID'] ?? 0),
      underOrgID: underOrgRaw == null ? null : Number(underOrgRaw),
      srNo: Number(raw['srNo'] ?? raw['SrNo'] ?? 0),
      tDate,
      documentTitle: String(raw['documentTitle'] ?? raw['DocumentTitle'] ?? ''),
      documentPath: (raw['documentPath'] ?? raw['DocumentPath'] ?? null) as string | null,
      organizationName: (raw['organizationName'] ?? raw['OrganizationName'] ?? null) as string | null
    };
  }
}
