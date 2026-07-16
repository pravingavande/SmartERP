import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  ApiResponse,
  Donation,
  DonationFormState,
  DonationListItem,
  DonationLookups,
  DRHeadDefine,
  DRHeadOption,
  OrgOption,
  PaymentTypeOption,
  FyOption,
  BankLedgerHeadOption
} from '../models/donation.model';
import { coerceEnglishIntegerString, coerceEnglishNumber, normalizeAadharDigits } from '../utils/marathi-numerals';

@Injectable({ providedIn: 'root' })
export class DonationService {
  private readonly base = `${environment.apiBaseUrl}/donation`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getLookups(): Observable<DonationLookups | null> {
    return this.http.get<ApiResponse<DonationLookups>>(`${this.base}/lookups`).pipe(
      map((r) => {
        if (!r.success || !r.data) return null;
        const raw = r.data as DonationLookups & {
          Orgs?: OrgOption[];
          FyList?: FyOption[];
          PaymentTypes?: PaymentTypeOption[];
          DrHeads?: DRHeadOption[];
          BankLedgerHeads?: BankLedgerHeadOption[];
        };
        return {
          orgs: this.auth.filterSchoolOrgs((raw.orgs ?? raw.Orgs ?? []).map((o) => this.normalizeOrg(o))),
          drHeads: (raw.drHeads ?? raw.DrHeads ?? []).map((h) => this.normalizeDrHead(h)),
          paymentTypes: (raw.paymentTypes ?? raw.PaymentTypes ?? []).map((p) => this.normalizePaymentType(p)),
          fyList: (raw.fyList ?? raw.FyList ?? []).map((fy) => this.normalizeFy(fy)),
          bankLedgerHeads: (raw.bankLedgerHeads ?? raw.BankLedgerHeads ?? []).map((b) => this.normalizeBankLedger(b))
        };
      }),
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

  downloadReceiptPdf(drId: number): Observable<Blob | null> {
    return this.http.get(`${this.base}/${drId}/report/pdf`, { responseType: 'blob' }).pipe(
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
      aadharNo: normalizeAadharDigits(form.aadharNo) || null,
      mobileNo: coerceEnglishIntegerString(form.mobileNo, 10) || null,
      amount: coerceEnglishNumber(form.amount),
      paymentTypeID: form.paymentTypeID,
      transactionNo: form.transactionNo || null,
      transactionDate: form.transactionDate || null,
      depositDate: form.depositDate || null,
      bankName: form.bankName || null,
      ledgerHeadBankID: form.ledgerHeadBankID,
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
  private normalizeOrg(raw: OrgOption & { OrgID?: number; OrganizationName?: string; SchoolCode?: number | null }): OrgOption {
    return {
      orgID: raw.orgID ?? raw.OrgID ?? 0,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? '',
      schoolCode: raw.schoolCode ?? raw.SchoolCode ?? null
    };
  }

  private normalizeFy(raw: FyOption & { FyID?: number; FyName?: string; FromDate?: string; ToDate?: string }): FyOption {
    return {
      fyID: raw.fyID ?? raw.FyID ?? 0,
      fyName: raw.fyName ?? raw.FyName ?? '',
      fromDate: raw.fromDate ?? raw.FromDate ?? '',
      toDate: raw.toDate ?? raw.ToDate ?? ''
    };
  }

  private normalizePaymentType(raw: PaymentTypeOption & { PaymentTypeID?: number; PaymentType?: string }): PaymentTypeOption {
    return {
      paymentTypeID: raw.paymentTypeID ?? raw.PaymentTypeID ?? 0,
      paymentType: raw.paymentType ?? raw.PaymentType ?? ''
    };
  }

  private normalizeDrHead(raw: DRHeadOption & { DRHeadID?: number; DRHeadName?: string }): DRHeadOption {
    return {
      drHeadID: raw.drHeadID ?? raw.DRHeadID ?? 0,
      drHeadName: raw.drHeadName ?? raw.DRHeadName ?? ''
    };
  }

  private normalizeBankLedger(raw: BankLedgerHeadOption & { LedgerHeadID?: number; LedgerHead?: string }): BankLedgerHeadOption {
    return {
      ledgerHeadID: raw.ledgerHeadID ?? raw.LedgerHeadID ?? 0,
      ledgerHead: raw.ledgerHead ?? raw.LedgerHead ?? ''
    };
  }

  private normalizeDonation<T extends DonationListItem>(item: T & {
    drid?: number;
    bankName?: string | null;
    ledgerHeadBankID?: number | null;
    depositBankName?: string | null;
    BankName?: string | null;
    LedgerHeadBankID?: number | null;
    DepositBankName?: string | null;
  }): T {
    const normalized = {
      ...item,
      drID: item.drID ?? item.drid ?? item.drID,
      bankName: item.bankName ?? item.BankName ?? null,
      ledgerHeadBankID: item.ledgerHeadBankID ?? item.LedgerHeadBankID ?? null,
      depositBankName: item.depositBankName ?? item.DepositBankName ?? null
    };
    return normalized as T;
  }
}
