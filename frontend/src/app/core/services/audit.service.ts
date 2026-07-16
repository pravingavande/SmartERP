import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
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
  OrgOption,
  PartyMaster,
  PartyOption,
  Voucher,
  VoucherListItem
} from '../models/audit.model';
import { coerceEnglishIntegerString, coerceEnglishNumber } from '../utils/marathi-numerals';
import { VoucherFormState } from '../models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly base = `${environment.apiBaseUrl}/audit`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getDashboard(fyId?: number | null): Observable<AuditDashboardPage> {
    let params = new HttpParams();
    if (fyId) params = params.set('fyId', fyId.toString());
    return this.http.get<ApiResponse<AuditDashboardPage | AuditDashboardRow[]>>(`${this.base}/dashboard`, { params }).pipe(
      map((r) => {
        if (!r.success || !r.data) return this.emptyDashboardPage();
        if (Array.isArray(r.data)) {
          return { summary: this.emptyDashboardPage().summary, rows: r.data.map((row) => this.normalizeDashboardRow(row)) };
        }
        return {
          summary: r.data.summary ?? this.emptyDashboardPage().summary,
          rows: (r.data.rows ?? []).map((row) => this.normalizeDashboardRow(row))
        };
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

  private normalizeDashboardRow(raw: AuditDashboardRow & {
    OrgID?: number;
    OrganizationName?: string;
    AccountRegisterID?: number;
    AccountRegister?: string;
    LastTransactionDate?: string | null;
    BankBalance?: number;
    VoucherCategory?: string;
  }): AuditDashboardRow {
    return {
      orgID: raw.orgID ?? raw.OrgID ?? 0,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? '',
      accountRegisterID: raw.accountRegisterID ?? raw.AccountRegisterID ?? 0,
      accountRegister: raw.accountRegister ?? raw.AccountRegister ?? '',
      lastTransactionDate: raw.lastTransactionDate ?? raw.LastTransactionDate ?? null,
      bankBalance: raw.bankBalance ?? raw.BankBalance ?? 0,
      voucherCategory: raw.voucherCategory ?? raw.VoucherCategory ?? ''
    };
  }

  getLookups(): Observable<AuditLookups | null> {
    return this.http.get<ApiResponse<AuditLookups>>(`${this.base}/lookups`).pipe(
      map((r) => {
        if (!r.success || !r.data) return null;
        const data = r.data as AuditLookups & { SansthaOrgs?: OrgOption[] };
        return {
          ...data,
          orgs: this.auth.filterSchoolOrgs((data.orgs ?? []).map((o) => this.normalizeOrgOption(o))),
          sansthaOrgs: (data.sansthaOrgs ?? data.SansthaOrgs ?? []).map((o) => this.normalizeOrgOption(o))
        };
      }),
      catchError(() => of(null))
    );
  }

  getSansthaOrgs(): Observable<OrgOption[]> {
    return this.http.get<ApiResponse<OrgOption[]>>(`${this.base}/sanstha-orgs`).pipe(
      map((r) => (r.success && r.data ? r.data.map((o) => this.normalizeOrgOption(o)) : [])),
      catchError(() => of([]))
    );
  }

  getAccountRegisters(orgId: number): Observable<AccountRegisterOption[]> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<AccountRegisterOption[]>>(`${this.base}/account-registers`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((item) => this.normalizeAccountRegister(item)) : [])),
      catchError(() => of([]))
    );
  }

  /** Active parties from Party Master for voucher dropdowns (Receipt & Payment). */
  getParties(orgId: number, includePartyId?: number | null): Observable<PartyOption[]> {
    return this.getPartyList(orgId).pipe(
      map((list) =>
        list
          .filter((p) => p.isActive !== false || p.partyID === includePartyId)
          .map((p) => this.partyMasterToOption(p))
          .sort((a, b) => a.partyName.localeCompare(b.partyName))
      )
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
      map((r) => (r.success && r.data ? r.data.map((item) => this.normalizeVoucherListItem(item)) : [])),
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
          amount: coerceEnglishNumber(d.amount)
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
      map((r) => (r.success && r.data ? r.data.map((p) => this.normalizePartyMaster(p)) : [])),
      catchError(() => of([]))
    );
  }

  getParty(partyId: number): Observable<PartyMaster | null> {
    return this.http.get<ApiResponse<PartyMaster>>(`${this.base}/party-master/${partyId}`).pipe(
      map((r) => (r.success && r.data ? this.normalizePartyMaster(r.data) : null)),
      catchError(() => of(null))
    );
  }

  saveParty(form: PartyFormState): Observable<{ data: PartyMaster | null; message: string | null }> {
    const payload = {
      partyID: form.partyID,
      orgID: form.orgID,
      partyName: form.partyName.trim(),
      address: form.address || null,
      mobNo: coerceEnglishIntegerString(form.mobNo, 10) || null,
      panNo: form.panNo || null,
      gstNo: form.gstNo || null,
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<PartyMaster>>(`${this.base}/party-master`, payload).pipe(
      map((r) => ({
        data: r.success && r.data ? this.normalizePartyMaster(r.data) : null,
        message: r.success ? null : (r.message ?? 'Unable to save party.')
      })),
      catchError(() => of({ data: null, message: 'Unable to save party.' }))
    );
  }

  private normalizeOrgOption(
    raw: OrgOption & {
      OrgID?: number;
      OrganizationName?: string;
      ShortName?: string | null;
      SchoolCode?: number | null;
      UnderOrgID?: number | null;
    }
  ): OrgOption {
    return {
      orgID: raw.orgID ?? raw.OrgID ?? 0,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? '',
      shortName: raw.shortName ?? raw.ShortName ?? null,
      schoolCode: raw.schoolCode ?? raw.SchoolCode ?? null,
      underOrgID: raw.underOrgID ?? raw.UnderOrgID ?? null
    };
  }

  private normalizeAccountRegister(
    raw: AccountRegisterOption & {
      AccountRegisterID?: number;
      AccountRegister?: string;
      OrgID?: number;
    }
  ): AccountRegisterOption {
    return {
      accountRegisterID: raw.accountRegisterID ?? raw.AccountRegisterID ?? 0,
      accountRegister: raw.accountRegister ?? raw.AccountRegister ?? '',
      orgID: raw.orgID ?? raw.OrgID ?? 0
    };
  }

  private normalizeLedgerHeadMaster(
    raw: LedgerHeadMaster & {
      LedgerHeadID?: number;
      UnderOrgID?: number;
      SrNo?: number;
      LedgerHead?: string;
      LedgerHeadShort?: string | null;
      LedgerTypeID?: number;
      LedgerType?: string | null;
      IsActive?: boolean;
    }
  ): LedgerHeadMaster {
    return {
      ledgerHeadID: raw.ledgerHeadID ?? raw.LedgerHeadID ?? 0,
      underOrgID: raw.underOrgID ?? raw.UnderOrgID ?? 0,
      srNo: raw.srNo ?? raw.SrNo ?? 0,
      ledgerHead: raw.ledgerHead ?? raw.LedgerHead ?? '',
      ledgerHeadShort: raw.ledgerHeadShort ?? raw.LedgerHeadShort ?? null,
      ledgerTypeID: raw.ledgerTypeID ?? raw.LedgerTypeID ?? 0,
      ledgerType: raw.ledgerType ?? raw.LedgerType ?? null,
      isActive: raw.isActive ?? raw.IsActive ?? true
    };
  }

  private partyMasterToOption(p: PartyMaster): PartyOption {
    return {
      partyID: p.partyID,
      partyCode: p.partyCode ?? (p.recordNo != null ? String(p.recordNo) : null),
      partyName: p.partyName,
      mobNo: p.mobNo ?? null
    };
  }

  private normalizePartyMaster(
    raw: PartyMaster & {
      PartyID?: number;
      OrgID?: number;
      RecordNo?: number | null;
      PartyCode?: string | null;
      PartyName?: string;
      Address?: string | null;
      MobNo?: string | null;
      PanNo?: string | null;
      GSTNo?: string | null;
      IsActive?: boolean;
    }
  ): PartyMaster {
    return {
      partyID: raw.partyID ?? raw.PartyID ?? 0,
      orgID: raw.orgID ?? raw.OrgID ?? 0,
      recordNo: raw.recordNo ?? raw.RecordNo ?? null,
      partyCode: raw.partyCode ?? raw.PartyCode ?? null,
      partyName: raw.partyName ?? raw.PartyName ?? '',
      address: raw.address ?? raw.Address ?? null,
      mobNo: raw.mobNo ?? raw.MobNo ?? null,
      panNo: raw.panNo ?? raw.PanNo ?? null,
      gstNo: raw.gstNo ?? raw.GSTNo ?? null,
      isActive: raw.isActive ?? raw.IsActive ?? true
    };
  }

  private normalizeVoucherListItem(
    raw: VoucherListItem & {
      VoucherID?: number;
      OrgID?: number;
      AccountRegisterID?: number;
      VType?: string;
      VCode?: number;
      VDate?: string;
      PartyTID?: number | null;
      TotalAmount?: number;
      Remark?: string | null;
      PaymentTypeID?: number | null;
      FyID?: number;
      OrganizationName?: string | null;
      AccountRegister?: string | null;
      PartyName?: string | null;
      PaymentType?: string | null;
    }
  ): VoucherListItem {
    return {
      voucherID: raw.voucherID ?? raw.VoucherID ?? 0,
      orgID: raw.orgID ?? raw.OrgID ?? 0,
      accountRegisterID: raw.accountRegisterID ?? raw.AccountRegisterID ?? 0,
      vType: raw.vType ?? raw.VType ?? '',
      vCode: raw.vCode ?? raw.VCode ?? 0,
      vDate: raw.vDate ?? raw.VDate ?? '',
      partyTID: raw.partyTID ?? raw.PartyTID ?? null,
      totalAmount: raw.totalAmount ?? raw.TotalAmount ?? 0,
      remark: raw.remark ?? raw.Remark ?? null,
      paymentTypeID: raw.paymentTypeID ?? raw.PaymentTypeID ?? null,
      fyID: raw.fyID ?? raw.FyID ?? 0,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? null,
      accountRegister: raw.accountRegister ?? raw.AccountRegister ?? null,
      partyName: raw.partyName ?? raw.PartyName ?? null,
      paymentType: raw.paymentType ?? raw.PaymentType ?? null
    };
  }

  getLedgerTypes(): Observable<LedgerTypeOption[]> {
    return this.http.get<ApiResponse<LedgerTypeOption[]>>(`${this.base}/ledger-types`).pipe(
      map((r) => (r.success && r.data ? r.data.map((t) => this.normalizeLedgerTypeOption(t)) : [])),
      catchError(() => of([]))
    );
  }

  private normalizeLedgerTypeOption(
    raw: LedgerTypeOption & { LedgerTypeID?: number; LedgerType?: string }
  ): LedgerTypeOption {
    return {
      ledgerTypeID: raw.ledgerTypeID ?? raw.LedgerTypeID ?? 0,
      ledgerType: raw.ledgerType ?? raw.LedgerType ?? ''
    };
  }

  getLedgerHeadList(underOrgId: number): Observable<LedgerHeadMaster[]> {
    const params = new HttpParams().set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<LedgerHeadMaster[]>>(`${this.base}/ledger-head-master`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((h) => this.normalizeLedgerHeadMaster(h)) : [])),
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

  saveLedgerHead(form: LedgerHeadFormState): Observable<{ data: LedgerHeadMaster | null; message: string | null }> {
    const payload = {
      ledgerHeadID: form.ledgerHeadID,
      underOrgID: form.underOrgID,
      ledgerHead: form.ledgerHead.trim(),
      ledgerHeadShort: form.ledgerHeadShort.trim() || null,
      ledgerTypeID: form.ledgerTypeID,
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<LedgerHeadMaster>>(`${this.base}/ledger-head-master`, payload).pipe(
      map((r) => ({
        data: r.success && r.data ? r.data : null,
        message: r.success ? null : (r.message ?? 'Unable to save ledger head.')
      })),
      catchError(() => of({ data: null, message: 'Unable to save ledger head.' }))
    );
  }
}
