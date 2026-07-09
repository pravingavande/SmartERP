import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountRegisterDefine,
  AccountRegisterMasterOption,
  AccountRegisterOption,
  ApiResponse,
  AuditDashboardPage,
  AuditDashboardRow,
  AuditDashboardSummary,
  AuditLookups,
  PartyFormState,
  LedgerHeadFormState,
  LedgerHeadMaster,
  LedgerTypeOption,
  PartyMaster,
  PartyOption,
  Voucher,
  VoucherListItem
} from '../models/audit.model';
import { VoucherFormState } from '../models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly base = `${environment.apiBaseUrl}/audit`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(fyId?: number | null): Observable<AuditDashboardPage> {
    let params = new HttpParams();
    if (fyId) params = params.set('fyId', fyId.toString());
    return this.http.get<ApiResponse<AuditDashboardPage | AuditDashboardRow[]>>(`${this.base}/dashboard`, { params }).pipe(
      map((r) => {
        if (!r.success || !r.data) return this.emptyDashboardPage();
        if (Array.isArray(r.data)) {
          return { summary: this.emptyDashboardPage().summary, rows: r.data };
        }
        return r.data;
      }),
      catchError(() => of(this.emptyDashboardPage()))
    );
  }

  private emptyDashboardPage(): AuditDashboardPage {
    return {
      summary: {
        fyName: '',
        receiptVoucherCount: 0,
        receiptVoucherAmount: 0,
        paymentVoucherCount: 0,
        paymentVoucherAmount: 0,
        donationCount: 0,
        donationAmount: 0
      },
      rows: []
    };
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
      bankName: form.bankName || null,
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

  getAccountRegisterMaster(): Observable<AccountRegisterMasterOption[]> {
    return this.http.get<ApiResponse<AccountRegisterMasterOption[]>>(`${this.base}/account-register-master`).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getAccountRegisterDefine(orgId: number): Observable<AccountRegisterDefine | null> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<AccountRegisterDefine>>(`${this.base}/account-register-define`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  saveAccountRegisterDefine(orgId: number, accountRegisterIds: number[]): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.base}/account-register-define`, { orgID: orgId, accountRegisterIds }).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }

  getPartyList(orgId: number): Observable<PartyMaster[]> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<PartyMaster[]>>(`${this.base}/party-master`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getParty(partyId: number): Observable<PartyMaster | null> {
    return this.http.get<ApiResponse<PartyMaster>>(`${this.base}/party-master/${partyId}`).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  saveParty(form: PartyFormState): Observable<PartyMaster | null> {
    const payload = {
      partyID: form.partyID,
      orgID: form.orgID,
      partyName: form.partyName.trim(),
      address: form.address || null,
      mobNo: form.mobNo || null,
      panNo: form.panNo || null,
      gstNo: form.gstNo || null,
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<PartyMaster>>(`${this.base}/party-master`, payload).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  getLedgerTypes(): Observable<LedgerTypeOption[]> {
    return this.http.get<ApiResponse<LedgerTypeOption[]>>(`${this.base}/ledger-types`).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getLedgerHeadList(underOrgId: number): Observable<LedgerHeadMaster[]> {
    const params = new HttpParams().set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<LedgerHeadMaster[]>>(`${this.base}/ledger-head-master`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : [])),
      catchError(() => of([]))
    );
  }

  getNextLedgerHeadSrNo(underOrgId: number): Observable<number> {
    const params = new HttpParams().set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<number>>(`${this.base}/ledger-head-master/next-sr-no`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : 1)),
      catchError(() => of(1))
    );
  }

  saveLedgerHead(form: LedgerHeadFormState): Observable<LedgerHeadMaster | null> {
    const payload = {
      ledgerHeadID: form.ledgerHeadID,
      underOrgID: form.underOrgID,
      ledgerHead: form.ledgerHead.trim(),
      ledgerHeadShort: form.ledgerHeadShort.trim() || null,
      ledgerTypeID: form.ledgerTypeID,
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<LedgerHeadMaster>>(`${this.base}/ledger-head-master`, payload).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }
}
