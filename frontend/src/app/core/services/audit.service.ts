import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  AccountRegisterDefine,
  AccountRegisterFormState,
  AccountRegisterMaster,
  AccountRegisterMasterOption,
  AccountRegisterOption,
  ImportAccountRegisterResult,
  ImportLedgerHeadResult,
  ApiResponse,
  AuditDashboardPage,
  AuditDashboardRow,
  AuditDashboardSummary,
  AuditCashSummaryAvailableRow,
  AuditCashSummaryPage,
  AuditCashSummaryVoucherRow,
  AuditLookups,
  PartyFormState,
  LedgerHeadFormState,
  LedgerHeadMaster,
  LedgerHeadOption,
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

  getCashSummary(fyId?: number | null, orgId?: number | null): Observable<AuditCashSummaryPage> {
    let params = new HttpParams();
    if (fyId) params = params.set('fyId', fyId.toString());
    if (orgId) params = params.set('orgId', orgId.toString());
    return this.http.get<ApiResponse<AuditCashSummaryPage>>(`${this.base}/dashboard/cash-summary`, { params }).pipe(
      map((r) => {
        if (!r.success || !r.data) return this.emptyCashSummaryPage();
        return {
          voucherRows: (r.data.voucherRows ?? []).map((row) =>
            this.normalizeCashVoucherRow(row as AuditCashSummaryVoucherRow & Record<string, unknown>)
          ),
          availableCashRows: (r.data.availableCashRows ?? []).map((row) =>
            this.normalizeCashAvailableRow(row as AuditCashSummaryAvailableRow & Record<string, unknown>)
          )
        };
      }),
      catchError(() => of(this.emptyCashSummaryPage()))
    );
  }

  private emptyCashSummaryPage(): AuditCashSummaryPage {
    return { voucherRows: [], availableCashRows: [] };
  }

  private normalizeCashVoucherRow(raw: AuditCashSummaryVoucherRow & Record<string, unknown>): AuditCashSummaryVoucherRow {
    const n = (a: string, b: string) => Number(raw[a as keyof typeof raw] ?? raw[b] ?? 0);
    return {
      orgID: Number(raw.orgID ?? raw['OrgID'] ?? 0),
      organizationName: String(raw.organizationName ?? raw['OrganizationName'] ?? ''),
      receiptToday: n('receiptToday', 'ReceiptToday'),
      receiptPreviousDay: n('receiptPreviousDay', 'ReceiptPreviousDay'),
      receiptCurrentWeek: n('receiptCurrentWeek', 'ReceiptCurrentWeek'),
      receiptCurrentMonth: n('receiptCurrentMonth', 'ReceiptCurrentMonth'),
      receiptCurrentFy: n('receiptCurrentFy', 'ReceiptCurrentFy'),
      paymentToday: n('paymentToday', 'PaymentToday'),
      paymentPreviousDay: n('paymentPreviousDay', 'PaymentPreviousDay'),
      paymentCurrentWeek: n('paymentCurrentWeek', 'PaymentCurrentWeek'),
      paymentCurrentMonth: n('paymentCurrentMonth', 'PaymentCurrentMonth'),
      paymentCurrentFy: n('paymentCurrentFy', 'PaymentCurrentFy')
    };
  }

  private normalizeCashAvailableRow(raw: AuditCashSummaryAvailableRow & Record<string, unknown>): AuditCashSummaryAvailableRow {
    return {
      orgID: Number(raw.orgID ?? raw['OrgID'] ?? 0),
      organizationName: String(raw.organizationName ?? raw['OrganizationName'] ?? ''),
      cashInHand: Number(raw.cashInHand ?? raw['CashInHand'] ?? 0),
      cashInBank: Number(raw.cashInBank ?? raw['CashInBank'] ?? 0)
    };
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

  getLookups(orgId?: number | null, vType?: string | null): Observable<AuditLookups | null> {
    let params = new HttpParams();
    if (orgId) params = params.set('orgId', orgId.toString());
    if (vType?.trim()) params = params.set('vType', vType.trim());

    return this.http.get<ApiResponse<AuditLookups>>(`${this.base}/lookups`, { params }).pipe(
      map((r) => {
        if (!r.success || !r.data) return null;
        const data = r.data as AuditLookups & {
          Orgs?: OrgOption[];
          SansthaOrgs?: OrgOption[];
          LedgerHeads?: LedgerHeadOption[];
          BankLedgerHeads?: LedgerHeadOption[];
        };
        const rawOrgs = data.orgs ?? data.Orgs ?? [];
        const rawLedgerHeads = data.ledgerHeads ?? data.LedgerHeads ?? [];
        const rawBankLedgerHeads = data.bankLedgerHeads ?? data.BankLedgerHeads ?? [];
        return {
          ...data,
          orgs: this.auth.filterSchoolOrgs(rawOrgs.map((o) => this.normalizeOrgOption(o))),
          sansthaOrgs: (data.sansthaOrgs ?? data.SansthaOrgs ?? []).map((o) => this.normalizeOrgOption(o)),
          ledgerHeads: rawLedgerHeads.map((h) => this.normalizeLedgerHead(h)),
          bankLedgerHeads: rawBankLedgerHeads.map((h) => this.normalizeLedgerHead(h))
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

  getLedgerNarrations(orgId: number, ledgerHeadId: number, search?: string | null): Observable<string[]> {
    let params = new HttpParams()
      .set('orgId', orgId.toString())
      .set('ledgerHeadId', ledgerHeadId.toString());
    const term = search?.trim();
    if (term) params = params.set('search', term);
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
        .filter((d) => d.ledgerHeadId != null && d.ledgerHeadId !== 0 && d.amount > 0)
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

  deleteVoucher(voucherId: number): Observable<{ ok: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/vouchers/${voucherId}`).pipe(
      map((r) => ({ ok: r.success, message: r.message ?? undefined })),
      catchError(() => of({ ok: false, message: 'Unable to delete voucher.' }))
    );
  }

  getAccountRegisterMaster(underOrgId?: number | null): Observable<AccountRegisterMasterOption[]> {
    let params = new HttpParams();
    if (underOrgId) params = params.set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<AccountRegisterMasterOption[]>>(`${this.base}/account-register-master`, { params }).pipe(
      map((r) =>
        r.success && r.data
          ? r.data.map((item) => this.normalizeAccountRegisterMasterOption(item))
          : []
      ),
      catchError(() => of([]))
    );
  }

  getAccountRegisterList(underOrgId: number): Observable<AccountRegisterMaster[]> {
    const params = new HttpParams().set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<AccountRegisterMaster[]>>(`${this.base}/account-register-master/list`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((item) => this.normalizeAccountRegisterMaster(item)) : [])),
      catchError(() => of([]))
    );
  }

  getNextAccountRegisterSrNo(underOrgId: number): Observable<number> {
    const params = new HttpParams().set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<number>>(`${this.base}/account-register-master/next-sr-no`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : 1)),
      catchError(() => of(1))
    );
  }

  saveAccountRegister(form: AccountRegisterFormState): Observable<{ data: AccountRegisterMaster | null; message: string | null }> {
    const payload = {
      accountRegisterID: form.accountRegisterID,
      underOrgID: form.underOrgID,
      srNo: form.srNo,
      accountRegister: form.accountRegister.trim(),
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<AccountRegisterMaster>>(`${this.base}/account-register-master`, payload).pipe(
      map((r) => ({
        data: r.success && r.data ? this.normalizeAccountRegisterMaster(r.data) : null,
        message: r.success ? null : (r.message ?? 'Unable to save account register.')
      })),
      catchError(() => of({ data: null, message: 'Unable to save account register.' }))
    );
  }

  deleteAccountRegister(accountRegisterId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/account-register-master/${accountRegisterId}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message ?? undefined })),
      catchError(() => of({ success: false, message: 'Unable to delete account register.' }))
    );
  }

  importAccountRegisters(
    destinationUnderOrgId: number,
    accountRegisterIds: number[]
  ): Observable<{ data: ImportAccountRegisterResult | null; message: string | null }> {
    const payload = {
      destinationUnderOrgID: destinationUnderOrgId,
      accountRegisterIds
    };
    return this.http
      .post<ApiResponse<ImportAccountRegisterResult & { ImportedCount?: number; SkippedCount?: number }>>(
        `${this.base}/account-register-master/import`,
        payload
      )
      .pipe(
        map((r) => {
          if (!r.success || !r.data) {
            return { data: null, message: r.message ?? 'Unable to import account registers.' };
          }
          return {
            data: {
              importedCount: Number(r.data.importedCount ?? r.data.ImportedCount ?? 0),
              skippedCount: Number(r.data.skippedCount ?? r.data.SkippedCount ?? 0)
            },
            message: r.message ?? null
          };
        }),
        catchError(() => of({ data: null, message: 'Unable to import account registers.' }))
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

  private normalizeLedgerHead(
    raw: LedgerHeadOption & {
      LedgerHeadID?: number;
      LedgerHead?: string;
      LedgerHeadEng?: string | null;
      LedgerTypeID?: number | null;
    }
  ): LedgerHeadOption {
    return {
      ledgerHeadID: raw.ledgerHeadID ?? raw.LedgerHeadID ?? 0,
      ledgerHead: raw.ledgerHead ?? raw.LedgerHead ?? '',
      ledgerHeadEng: raw.ledgerHeadEng ?? raw.LedgerHeadEng ?? null,
      ledgerTypeID: raw.ledgerTypeID ?? raw.LedgerTypeID ?? null
    };
  }

  private normalizeAccountRegisterMasterOption(
    raw: AccountRegisterMasterOption & {
      AccountRegisterID?: number;
      UnderOrgID?: number | null;
      SrNo?: number | null;
      AccountRegister?: string;
      IsActive?: boolean;
    }
  ): AccountRegisterMasterOption {
    return {
      accountRegisterID: raw.accountRegisterID ?? raw.AccountRegisterID ?? 0,
      underOrgID: raw.underOrgID ?? raw.UnderOrgID ?? null,
      srNo: raw.srNo ?? raw.SrNo ?? null,
      accountRegister: raw.accountRegister ?? raw.AccountRegister ?? '',
      isActive: raw.isActive ?? raw.IsActive ?? true
    };
  }

  private normalizeAccountRegisterMaster(
    raw: AccountRegisterMaster & {
      AccountRegisterID?: number;
      UnderOrgID?: number;
      SrNo?: number;
      AccountRegister?: string;
      IsActive?: boolean;
      OrganizationName?: string | null;
    }
  ): AccountRegisterMaster {
    return {
      accountRegisterID: raw.accountRegisterID ?? raw.AccountRegisterID ?? 0,
      underOrgID: raw.underOrgID ?? raw.UnderOrgID ?? 0,
      srNo: raw.srNo ?? raw.SrNo ?? 0,
      accountRegister: raw.accountRegister ?? raw.AccountRegister ?? '',
      isActive: raw.isActive ?? raw.IsActive ?? true,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? null
    };
  }

  private normalizeLedgerHeadMaster(
    raw: LedgerHeadMaster & {
      LedgerHeadID?: number;
      UnderOrgID?: number;
      OrgID?: number | null;
      SrNo?: number;
      LedgerHead?: string;
      LedgerHeadEng?: string | null;
      ledgerHeadShort?: string | null;
      LedgerHeadShort?: string | null;
      Description?: string | null;
      LedgerTypeID?: number;
      LedgerType?: string | null;
      IsActive?: boolean;
    }
  ): LedgerHeadMaster {
    const underOrgID = raw.underOrgID ?? raw.UnderOrgID ?? 0;
    return {
      ledgerHeadID: raw.ledgerHeadID ?? raw.LedgerHeadID ?? 0,
      underOrgID,
      orgID: raw.orgID ?? raw.OrgID ?? underOrgID,
      srNo: raw.srNo ?? raw.SrNo ?? 0,
      ledgerHead: raw.ledgerHead ?? raw.LedgerHead ?? '',
      ledgerHeadEng: raw.ledgerHeadEng ?? raw.LedgerHeadEng ?? raw.ledgerHeadShort ?? raw.LedgerHeadShort ?? null,
      description: raw.description ?? raw.Description ?? null,
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
    const orgId = form.orgID ?? form.underOrgID;
    const payload = {
      ledgerHeadID: form.ledgerHeadID,
      underOrgID: form.underOrgID,
      orgID: orgId,
      ledgerHead: form.ledgerHead.trim(),
      ledgerHeadEng: form.ledgerHeadEng.trim() || null,
      description: form.description.trim() || null,
      ledgerTypeID: form.ledgerTypeID,
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<LedgerHeadMaster>>(`${this.base}/ledger-head-master`, payload).pipe(
      map((r) => ({
        data: r.success && r.data ? this.normalizeLedgerHeadMaster(r.data) : null,
        message: r.success ? null : (r.message ?? 'Unable to save ledger head.')
      })),
      catchError(() => of({ data: null, message: 'Unable to save ledger head.' }))
    );
  }

  importLedgerHeads(
    destinationUnderOrgId: number,
    ledgerHeadIds: number[]
  ): Observable<{ data: ImportLedgerHeadResult | null; message: string | null }> {
    const payload = {
      destinationUnderOrgID: destinationUnderOrgId,
      destinationOrgID: destinationUnderOrgId,
      ledgerHeadIds
    };
    return this.http
      .post<ApiResponse<ImportLedgerHeadResult & { ImportedCount?: number; SkippedCount?: number }>>(
        `${this.base}/ledger-head-master/import`,
        payload
      )
      .pipe(
        map((r) => {
          if (!r.success || !r.data) {
            return { data: null, message: r.message ?? 'Unable to import ledger heads.' };
          }
          return {
            data: {
              importedCount: Number(r.data.importedCount ?? r.data.ImportedCount ?? 0),
              skippedCount: Number(r.data.skippedCount ?? r.data.SkippedCount ?? 0)
            },
            message: r.message ?? null
          };
        }),
        catchError(() => of({ data: null, message: 'Unable to import ledger heads.' }))
      );
  }
}
