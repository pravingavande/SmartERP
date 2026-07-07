import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountRegisterOption,
  ApiResponse,
  AuditDashboardRow,
  AuditLookups,
  PartyOption,
  Voucher,
  VoucherListItem
} from '../models/audit.model';
import { VoucherFormState } from '../models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly base = `${environment.apiBaseUrl}/audit`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(): Observable<AuditDashboardRow[]> {
    return this.http.get<ApiResponse<AuditDashboardRow[]>>(`${this.base}/dashboard`).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getLookups(): Observable<AuditLookups | null> {
    return this.http.get<ApiResponse<AuditLookups>>(`${this.base}/lookups`).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  getAccountRegisters(orgId: number): Observable<AccountRegisterOption[]> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<AccountRegisterOption[]>>(`${this.base}/account-registers`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getParties(orgId: number): Observable<PartyOption[]> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<PartyOption[]>>(`${this.base}/parties`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getLedgerNarrations(ledgerHeadId: number): Observable<string[]> {
    const params = new HttpParams().set('ledgerHeadId', ledgerHeadId.toString());
    return this.http.get<ApiResponse<string[]>>(`${this.base}/ledger-narrations`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getNextVCode(orgId: number, accountRegisterId: number, fyId: number, vType: string): Observable<number> {
    const params = new HttpParams()
      .set('orgId', orgId.toString())
      .set('accountRegisterId', accountRegisterId.toString())
      .set('fyId', fyId.toString())
      .set('vType', vType);
    return this.http.get<ApiResponse<number>>(`${this.base}/next-vcode`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : 1)),
      catchError(() => of(1))
    );
  }

  getVouchers(orgId: number, vType: string, fyId?: number | null): Observable<VoucherListItem[]> {
    let params = new HttpParams().set('orgId', orgId.toString()).set('vType', vType);
    if (fyId) params = params.set('fyId', fyId.toString());
    return this.http.get<ApiResponse<VoucherListItem[]>>(`${this.base}/vouchers`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getVoucher(voucherId: number): Observable<Voucher | null> {
    return this.http.get<ApiResponse<Voucher>>(`${this.base}/vouchers/${voucherId}`).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  saveVoucher(vType: string, form: VoucherFormState): Observable<Voucher | null> {
    const payload = {
      voucherID: form.voucherID,
      orgID: form.orgID,
      accountRegisterID: form.accountRegisterID,
      vType,
      vCode: form.vCode,
      vDate: form.vDate,
      partyTID: form.partyTID,
      remark: form.remark || null,
      paymentTypeID: form.paymentTypeID,
      transactionNo: form.transactionNo || null,
      transactionDate: form.transactionDate || null,
      depositDate: form.depositDate || null,
      ledgerHeadBankID: form.ledgerHeadBankID,
      filePath: form.filePath || null,
      fyID: form.fyID,
      details: form.details
        .filter((d) => d.ledgerHeadId && d.amount > 0)
        .map((d) => ({
          srNo: d.srNo,
          ledgerHeadId: d.ledgerHeadId!,
          ledgerHeadNarration: d.ledgerHeadNarration || null,
          amount: d.amount
        }))
    };

    return this.http.post<ApiResponse<Voucher>>(`${this.base}/vouchers`, payload).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  deleteVoucher(voucherId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/vouchers/${voucherId}`).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }
}
