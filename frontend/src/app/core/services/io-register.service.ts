import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  InwardFilter,
  InwardFormState,
  InwardRegisterItem,
  IoLookups,
  NextRecordNo,
  OutwardFilter,
  OutwardFormState,
  OutwardRegisterItem,
  YearIoOption
} from '../models/io-register.model';
import { apiData, apiMessage, apiSuccess, apiUploadHttpError } from '../utils/api-response.util';
import { encodeRelativeStoragePath } from '../utils/local-file-url.util';
import { trimText } from '../utils/master-validation.util';

@Injectable({ providedIn: 'root' })
export class IoRegisterService {
  private readonly base = `${environment.apiBaseUrl}/io`;

  constructor(private readonly http: HttpClient) {}

  getLookups(): Observable<{ data: IoLookups | null; error: string | null }> {
    return this.http.get<ApiResponse<IoLookups>>(`${this.base}/lookups`).pipe(
      map((r) => {
        if (apiSuccess(r) && apiData(r)) {
          return {
            data: this.normalizeLookups(apiData(r)! as IoLookups & Record<string, unknown>),
            error: null
          };
        }
        return { data: null, error: apiMessage(r) ?? 'Unable to load IO lookups.' };
      }),
      catchError((err) => of({ data: null, error: apiUploadHttpError(err, 'Unable to load IO lookups.') }))
    );
  }

  getInwardNextRecordNo(orgId: number, yioId?: number | null): Observable<NextRecordNo | null> {
    let params = new HttpParams().set('orgId', orgId);
    if (yioId) params = params.set('yioId', yioId);
    return this.http.get<ApiResponse<NextRecordNo>>(`${this.base}/inward/next-record-no`, { params }).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? apiData(r)! : null)),
      catchError(() => of(null))
    );
  }

  getInwardList(filter: InwardFilter): Observable<InwardRegisterItem[]> {
    const params = this.buildInwardParams(filter);
    return this.http.get<ApiResponse<InwardRegisterItem[]>>(`${this.base}/inward`, { params }).pipe(
      map((r) => (apiSuccess(r) && r.data ? r.data.map((x) => this.normalizeInward(x as InwardRegisterItem & Record<string, unknown>)) : [])),
      catchError(() => of([]))
    );
  }

  getInwardById(irid: number): Observable<InwardRegisterItem | null> {
    return this.http.get<ApiResponse<InwardRegisterItem>>(`${this.base}/inward/${irid}`).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? this.normalizeInward(apiData(r) as InwardRegisterItem & Record<string, unknown>) : null)),
      catchError(() => of(null))
    );
  }

  saveInward(form: InwardFormState): Observable<{ data: InwardRegisterItem | null; message?: string }> {
    const payload = {
      irid: form.irid ?? 0,
      orgID: form.orgID,
      irDate: form.irDate,
      fileNo: trimText(form.fileNo) || null,
      letterNo: trimText(form.letterNo) || null,
      fromWhomReceived: trimText(form.fromWhomReceived),
      subject: trimText(form.subject),
      toWhomIssued: trimText(form.toWhomIssued) || null,
      remark: trimText(form.remark) || null,
      attachmentPath: trimText(form.attachmentPath) || null
    };
    return this.http.post<ApiResponse<InwardRegisterItem>>(`${this.base}/inward`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeInward(apiData(r) as InwardRegisterItem & Record<string, unknown>) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to save inward entry.' }))
    );
  }

  deleteInward(irid: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/inward/${irid}`).pipe(
      map((r) => ({ success: apiSuccess(r), message: apiMessage(r) })),
      catchError(() => of({ success: false, message: 'Unable to delete inward entry.' }))
    );
  }

  uploadInwardFile(file: File, orgId: number): Observable<{ fileName: string | null; message?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.post<ApiResponse<string>>(`${this.base}/inward/upload`, formData, { params }).pipe(
      map((r) => ({ fileName: apiSuccess(r) ? apiData(r) ?? null : null, message: apiMessage(r) })),
      catchError(() => of({ fileName: null, message: 'Unable to upload file.' }))
    );
  }

  inwardFileUrl(fileName: string): string {
    return `${this.base}/inward/file/${encodeRelativeStoragePath(fileName)}`;
  }

  exportInward(filter: InwardFilter, format: 'csv' | 'pdf'): Observable<Blob> {
    let params = this.buildInwardParams(filter).set('format', format);
    return this.http.get(`${this.base}/inward/export`, { params, responseType: 'blob' });
  }

  getOutwardNextRecordNo(orgId: number, yioId?: number | null): Observable<NextRecordNo | null> {
    let params = new HttpParams().set('orgId', orgId);
    if (yioId) params = params.set('yioId', yioId);
    return this.http.get<ApiResponse<NextRecordNo>>(`${this.base}/outward/next-record-no`, { params }).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? apiData(r)! : null)),
      catchError(() => of(null))
    );
  }

  getOutwardList(filter: OutwardFilter): Observable<OutwardRegisterItem[]> {
    const params = this.buildOutwardParams(filter);
    return this.http.get<ApiResponse<OutwardRegisterItem[]>>(`${this.base}/outward`, { params }).pipe(
      map((r) => (apiSuccess(r) && r.data ? r.data.map((x) => this.normalizeOutward(x as OutwardRegisterItem & Record<string, unknown>)) : [])),
      catchError(() => of([]))
    );
  }

  getOutwardById(orid: number): Observable<OutwardRegisterItem | null> {
    return this.http.get<ApiResponse<OutwardRegisterItem>>(`${this.base}/outward/${orid}`).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? this.normalizeOutward(apiData(r) as OutwardRegisterItem & Record<string, unknown>) : null)),
      catchError(() => of(null))
    );
  }

  saveOutward(form: OutwardFormState): Observable<{ data: OutwardRegisterItem | null; message?: string }> {
    const payload = {
      orid: form.orid ?? 0,
      orgID: form.orgID,
      orDate: form.orDate,
      enclosures: trimText(form.enclosures) || null,
      address: trimText(form.address),
      subject: trimText(form.subject),
      fileNo: trimText(form.fileNo) || null,
      orrDate: form.orrDate || null,
      expensesAmt: form.expensesAmt ?? 0,
      remark: trimText(form.remark) || null,
      attachmentPath: trimText(form.attachmentPath) || null
    };
    return this.http.post<ApiResponse<OutwardRegisterItem>>(`${this.base}/outward`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeOutward(apiData(r) as OutwardRegisterItem & Record<string, unknown>) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to save outward entry.' }))
    );
  }

  deleteOutward(orid: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/outward/${orid}`).pipe(
      map((r) => ({ success: apiSuccess(r), message: apiMessage(r) })),
      catchError(() => of({ success: false, message: 'Unable to delete outward entry.' }))
    );
  }

  uploadOutwardFile(file: File, orgId: number): Observable<{ fileName: string | null; message?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.post<ApiResponse<string>>(`${this.base}/outward/upload`, formData, { params }).pipe(
      map((r) => ({ fileName: apiSuccess(r) ? apiData(r) ?? null : null, message: apiMessage(r) })),
      catchError(() => of({ fileName: null, message: 'Unable to upload file.' }))
    );
  }

  outwardFileUrl(fileName: string): string {
    return `${this.base}/outward/file/${encodeRelativeStoragePath(fileName)}`;
  }

  exportOutward(filter: OutwardFilter, format: 'csv' | 'pdf'): Observable<Blob> {
    let params = this.buildOutwardParams(filter).set('format', format);
    return this.http.get(`${this.base}/outward/export`, { params, responseType: 'blob' });
  }

  downloadFile(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  private buildInwardParams(filter: InwardFilter): HttpParams {
    let params = new HttpParams().set('orgID', filter.orgID);
    if (filter.yioID) params = params.set('yioID', filter.yioID);
    if (filter.recordNo) params = params.set('recordNo', filter.recordNo);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    if (filter.fileNo?.trim()) params = params.set('fileNo', filter.fileNo.trim());
    if (filter.letterNo?.trim()) params = params.set('letterNo', filter.letterNo.trim());
    if (filter.subject?.trim()) params = params.set('subject', filter.subject.trim());
    if (filter.fromWhomReceived?.trim()) params = params.set('fromWhomReceived', filter.fromWhomReceived.trim());
    if (filter.search?.trim()) params = params.set('search', filter.search.trim());
    return params;
  }

  private buildOutwardParams(filter: OutwardFilter): HttpParams {
    let params = new HttpParams().set('orgID', filter.orgID);
    if (filter.yioID) params = params.set('yioID', filter.yioID);
    if (filter.recordNo) params = params.set('recordNo', filter.recordNo);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    if (filter.fileNo?.trim()) params = params.set('fileNo', filter.fileNo.trim());
    if (filter.subject?.trim()) params = params.set('subject', filter.subject.trim());
    if (filter.address?.trim()) params = params.set('address', filter.address.trim());
    if (filter.search?.trim()) params = params.set('search', filter.search.trim());
    return params;
  }

  private normalizeLookups(raw: IoLookups & Record<string, unknown>): IoLookups {
    const rawOrgs = (raw.orgs ?? raw['Orgs'] ?? []) as unknown as Array<Record<string, unknown>>;
    const rawYears = (raw.years ?? raw['Years'] ?? []) as unknown as Array<Record<string, unknown>>;
    const rawActive = raw.activeYear ?? raw['ActiveYear'];
    return {
      orgs: rawOrgs.map((o) => ({
        orgID: Number(o['orgID'] ?? o['OrgID'] ?? 0),
        organizationName: String(o['organizationName'] ?? o['OrganizationName'] ?? ''),
        schoolCode: (o['schoolCode'] ?? o['SchoolCode']) as number | null | undefined,
        underOrgID: (o['underOrgID'] ?? o['UnderOrgID']) as number | null | undefined
      })),
      years: rawYears.map((y) => this.normalizeYear(y)),
      activeYear: rawActive ? this.normalizeYear(rawActive as Record<string, unknown>) : null
    };
  }

  private normalizeYear(raw: Record<string, unknown>): YearIoOption {
    return {
      yioID: Number(raw['yioID'] ?? raw['YIOID'] ?? 0),
      yearName: String(raw['yearName'] ?? raw['YearName'] ?? ''),
      yearLabel: (raw['yearLabel'] ?? raw['YearLabel']) as string | null | undefined,
      isActive: Boolean(raw['isActive'] ?? raw['IsActive'])
    };
  }

  private normalizeInward(raw: InwardRegisterItem & Record<string, unknown>): InwardRegisterItem {
    return {
      irid: Number(raw.irid ?? raw['IRID'] ?? 0),
      orgID: Number(raw.orgID ?? raw['OrgID'] ?? 0),
      recordNo: Number(raw.recordNo ?? raw['RecordNo'] ?? 0),
      irDate: String(raw.irDate ?? raw['IRDate'] ?? '').slice(0, 10),
      fileNo: (raw.fileNo ?? raw['FileNo']) as string | null,
      letterNo: (raw.letterNo ?? raw['LetterNo']) as string | null,
      fromWhomReceived: String(raw.fromWhomReceived ?? raw['FromWhomReceived'] ?? ''),
      subject: String(raw.subject ?? raw['Subject'] ?? ''),
      toWhomIssued: (raw.toWhomIssued ?? raw['ToWhomIssued']) as string | null,
      remark: (raw.remark ?? raw['Remark']) as string | null,
      attachmentPath: (raw.attachmentPath ?? raw['AttachmentPath']) as string | null,
      yioID: Number(raw.yioID ?? raw['YIOID'] ?? 0),
      organizationName: (raw.organizationName ?? raw['OrganizationName']) as string | null,
      yearName: (raw.yearName ?? raw['YearName']) as string | null
    };
  }

  private normalizeOutward(raw: OutwardRegisterItem & Record<string, unknown>): OutwardRegisterItem {
    return {
      orid: Number(raw.orid ?? raw['ORID'] ?? 0),
      orgID: Number(raw.orgID ?? raw['OrgID'] ?? 0),
      recordNo: Number(raw.recordNo ?? raw['RecordNo'] ?? 0),
      orDate: String(raw.orDate ?? raw['ORDate'] ?? '').slice(0, 10),
      enclosures: (raw.enclosures ?? raw['Enclosures']) as string | null,
      address: String(raw.address ?? raw['Address'] ?? ''),
      subject: String(raw.subject ?? raw['Subject'] ?? ''),
      fileNo: (raw.fileNo ?? raw['FileNo']) as string | null,
      orrDate: raw.orrDate || raw['ORRDate'] ? String(raw.orrDate ?? raw['ORRDate']).slice(0, 10) : null,
      expensesAmt: Number(raw.expensesAmt ?? raw['ExpensesAmt'] ?? 0),
      remark: (raw.remark ?? raw['Remark']) as string | null,
      attachmentPath: (raw.attachmentPath ?? raw['AttachmentPath']) as string | null,
      yioID: Number(raw.yioID ?? raw['YIOID'] ?? 0),
      organizationName: (raw.organizationName ?? raw['OrganizationName']) as string | null,
      yearName: (raw.yearName ?? raw['YearName']) as string | null
    };
  }
}
