import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Donation,
  DonationFormState,
  DonationListItem,
  DonationLookups,
  DRHeadDefine,
  DRHeadOption
} from '../models/donation.model';

@Injectable({ providedIn: 'root' })
export class DonationService {
  private readonly base = `${environment.apiBaseUrl}/donation`;

  constructor(private readonly http: HttpClient) {}

  getLookups(): Observable<DonationLookups | null> {
    return this.http.get<ApiResponse<DonationLookups>>(`${this.base}/lookups`).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  getNextReceiptNo(fyId: number): Observable<number> {
    const params = new HttpParams().set('fyId', fyId.toString());
    return this.http.get<ApiResponse<number>>(`${this.base}/next-receipt-no`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : 1)),
      catchError(() => of(1))
    );
  }

  getNextOrgReceiptNo(orgId: number, fyId: number): Observable<number> {
    const params = new HttpParams().set('orgId', orgId.toString()).set('fyId', fyId.toString());
    return this.http.get<ApiResponse<number>>(`${this.base}/next-org-receipt-no`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : 1)),
      catchError(() => of(1))
    );
  }

  getList(orgId?: number | null, fyId?: number | null): Observable<DonationListItem[]> {
    let params = new HttpParams();
    if (orgId) params = params.set('orgId', orgId.toString());
    if (fyId) params = params.set('fyId', fyId.toString());
    return this.http.get<ApiResponse<DonationListItem[]>>(this.base, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((item) => this.normalizeDonation(item)) : [])),
      catchError(() => of([]))
    );
  }

  getById(drId: number): Observable<Donation | null> {
    return this.http.get<ApiResponse<Donation>>(`${this.base}/${drId}`).pipe(
      map((r) => (r.success && r.data ? this.normalizeDonation(r.data) : null)),
      catchError(() => of(null))
    );
  }

  save(form: DonationFormState): Observable<Donation | null> {
    const payload = {
      drID: form.drID,
      receiptNo: form.receiptNo || null,
      receiptDate: form.receiptDate,
      drHeadID: form.drHeadID,
      donorName: form.donorName,
      address: form.address || null,
      panNo: form.panNo || null,
      aadharNo: form.aadharNo || null,
      mobileNo: form.mobileNo || null,
      amount: form.amount,
      paymentTypeID: form.paymentTypeID,
      transactionNo: form.transactionNo || null,
      transactionDate: form.transactionDate || null,
      depositDate: form.depositDate || null,
      remark: form.remark || null,
      fyID: form.fyID,
      orgID: form.orgID,
      orgIDReceiptNo: form.orgIDReceiptNo || null
    };

    return this.http.post<ApiResponse<Donation>>(this.base, payload).pipe(
      map((r) => (r.success && r.data ? this.normalizeDonation(r.data) : null)),
      catchError(() => of(null))
    );
  }

  delete(drId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/${drId}`).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }

  getDRHeadMaster(): Observable<DRHeadOption[]> {
    return this.http.get<ApiResponse<DRHeadOption[]>>(`${this.base}/dr-head-master`).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getDRHeadsForOrg(orgId: number): Observable<DRHeadOption[]> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<DRHeadOption[]>>(`${this.base}/dr-heads`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getDRHeadDefine(orgId: number): Observable<DRHeadDefine | null> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<DRHeadDefine>>(`${this.base}/dr-head-define`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  saveDRHeadDefine(orgId: number, drHeadIds: number[]): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.base}/dr-head-define`, { orgID: orgId, drHeadIds }).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }

  /** API may return `drid` (all-caps acronym) instead of `drID` until backend DTO is updated. */
  private normalizeDonation<T extends DonationListItem>(item: T & { drid?: number }): T {
    if (item.drID == null && item.drid != null) {
      return { ...item, drID: item.drid };
    }
    return item;
  }
}
