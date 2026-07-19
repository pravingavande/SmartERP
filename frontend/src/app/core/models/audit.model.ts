export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface OrgOption {
  orgID: number;
  organizationName: string;
  shortName?: string | null;
  schoolCode?: number | null;
  underOrgID?: number | null;
}

export interface AccountRegisterOption {
  accountRegisterID: number;
  accountRegister: string;
  orgID: number;
}

export interface PartyOption {
  partyID: number;
  partyCode?: string | null;
  partyName: string;
  mobNo?: string | null;
}

export interface PaymentTypeOption {
  paymentTypeID: number;
  paymentType: string;
}

export interface FyOption {
  fyID: number;
  fyName: string;
  fromDate: string;
  toDate: string;
}

export interface LedgerHeadOption {
  ledgerHeadID: number;
  ledgerHead: string;
  ledgerHeadShort?: string | null;
  ledgerTypeID?: number | null;
}

export interface AuditLookups {
  orgs: OrgOption[];
  sansthaOrgs: OrgOption[];
  paymentTypes: PaymentTypeOption[];
  fyList: FyOption[];
  ledgerHeads: LedgerHeadOption[];
  bankLedgerHeads: LedgerHeadOption[];
}

export interface VoucherDetailLine {
  rowId: number;
  srNo: number;
  ledgerHeadId: number | null;
  ledgerHeadNarration: string;
  amount: number;
}

export interface VoucherFormState {
  voucherID: number | null;
  orgID: number | null;
  accountRegisterID: number | null;
  vCode: number;
  vDate: string;
  partyTID: number | null;
  remark: string;
  paymentTypeID: number | null;
  transactionNo: string;
  transactionDate: string;
  depositDate: string;
  ledgerHeadBankID: number | null;
  bankName: string;
  filePath: string;
  fyID: number | null;
  details: VoucherDetailLine[];
}

export interface VoucherListItem {
  voucherID: number;
  orgID: number;
  accountRegisterID: number;
  vType: string;
  vCode: number;
  vDate: string;
  partyTID?: number | null;
  totalAmount: number;
  remark?: string | null;
  paymentTypeID?: number | null;
  fyID: number;
  organizationName?: string | null;
  accountRegister?: string | null;
  partyName?: string | null;
  paymentType?: string | null;
}

export interface VoucherDetail {
  voucherDetailID: number;
  voucherID: number;
  srNo: number;
  ledgerHeadID: number;
  ledgerHeadNarration?: string | null;
  amount: number;
  ledgerHead?: string | null;
}

export interface Voucher {
  voucherID: number;
  orgID: number;
  accountRegisterID: number;
  vType: string;
  vCode: number;
  vDate: string;
  partyTID?: number | null;
  totalAmount: number;
  remark?: string | null;
  paymentTypeID?: number | null;
  transactionNo?: string | null;
  transactionDate?: string | null;
  depositDate?: string | null;
  ledgerHeadBankID?: number | null;
  bankName?: string | null;
  filePath?: string | null;
  userID: number;
  fyID: number;
  organizationName?: string | null;
  accountRegister?: string | null;
  partyName?: string | null;
  paymentType?: string | null;
  fyName?: string | null;
  details: VoucherDetail[];
}

export interface AuditDashboardRow {
  orgID: number;
  organizationName: string;
  accountRegisterID: number;
  accountRegister: string;
  lastTransactionDate?: string | null;
  bankBalance: number;
  voucherCategory: string;
}

export interface AuditDashboardSummary {
  fyID?: number | null;
  fyName: string;
  receiptVoucherCount: number;
  receiptVoucherAmount: number;
  paymentVoucherCount: number;
  paymentVoucherAmount: number;
  donationCount: number;
  donationAmount: number;
}

export interface AuditDashboardPage {
  summary: AuditDashboardSummary;
  rows: AuditDashboardRow[];
}

export interface AuditCashSummaryVoucherRow {
  orgID: number;
  organizationName: string;
  receiptToday: number;
  receiptPreviousDay: number;
  receiptCurrentWeek: number;
  receiptCurrentMonth: number;
  receiptCurrentFy: number;
  paymentToday: number;
  paymentPreviousDay: number;
  paymentCurrentWeek: number;
  paymentCurrentMonth: number;
  paymentCurrentFy: number;
}

export interface AuditCashSummaryAvailableRow {
  orgID: number;
  organizationName: string;
  cashInHand: number;
  cashInBank: number;
}

export interface AuditCashSummaryPage {
  voucherRows: AuditCashSummaryVoucherRow[];
  availableCashRows: AuditCashSummaryAvailableRow[];
}

export const CASH_PAYMENT_TYPE_ID = 1;

export interface AccountRegisterMasterOption {
  accountRegisterID: number;
  underOrgID?: number | null;
  srNo?: number | null;
  accountRegister: string;
  isActive?: boolean;
}

export interface AccountRegisterMaster {
  accountRegisterID: number;
  underOrgID: number;
  srNo: number;
  accountRegister: string;
  isActive: boolean;
  organizationName?: string | null;
}

export interface AccountRegisterFormState {
  accountRegisterID: number | null;
  underOrgID: number | null;
  srNo: number | null;
  accountRegister: string;
  isActive: boolean;
}

export interface ImportAccountRegisterResult {
  importedCount: number;
  skippedCount: number;
}

export interface AccountRegisterDefine {
  orgID: number;
  accountRegisterIds: number[];
}

export interface PartyMaster {
  partyID: number;
  orgID: number;
  recordNo?: number | null;
  partyCode?: string | null;
  partyName: string;
  address?: string | null;
  mobNo?: string | null;
  panNo?: string | null;
  gstNo?: string | null;
  isActive: boolean;
}

export interface PartyFormState {
  partyID: number | null;
  orgID: number | null;
  partyName: string;
  address: string;
  mobNo: string;
  panNo: string;
  gstNo: string;
  isActive: boolean;
}

export interface LedgerTypeOption {
  ledgerTypeID: number;
  ledgerType: string;
}

export interface LedgerHeadMaster {
  ledgerHeadID: number;
  underOrgID: number;
  srNo: number;
  ledgerHead: string;
  ledgerHeadShort?: string | null;
  ledgerTypeID: number;
  ledgerType?: string | null;
  isActive: boolean;
}

export interface LedgerHeadFormState {
  ledgerHeadID: number | null;
  underOrgID: number | null;
  srNo: number;
  ledgerHead: string;
  ledgerHeadShort: string;
  ledgerTypeID: number | null;
  isActive: boolean;
}
