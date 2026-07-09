export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface OrgOption {
  orgID: number;
  organizationName: string;
  schoolCode?: number | null;
}

export interface DRHeadOption {
  drHeadID: number;
  drHeadName: string;
}

export interface PaymentTypeOption {
  paymentTypeID: number;
  paymentType: string;
}

export interface FyOption {
  fyID: number;
  fyName: string;
}

export interface DonationLookups {
  orgs: OrgOption[];
  drHeads: DRHeadOption[];
  paymentTypes: PaymentTypeOption[];
  fyList: FyOption[];
  bankLedgerHeads: BankLedgerHeadOption[];
}

export interface BankLedgerHeadOption {
  ledgerHeadID: number;
  ledgerHead: string;
}

export interface DonationFormState {
  drID: number | null;
  receiptNo: number;
  orgIDReceiptNo: number;
  receiptDate: string;
  drHeadID: number | null;
  donorName: string;
  address: string;
  panNo: string;
  aadharNo: string;
  mobileNo: string;
  amount: number;
  paymentTypeID: number | null;
  transactionNo: string;
  transactionDate: string;
  depositDate: string;
  bankName: string;
  ledgerHeadBankID: number | null;
  remark: string;
  fyID: number | null;
  orgID: number | null;
}

export interface DonationListItem {
  drID: number;
  receiptNo?: number | null;
  receiptDate?: string | null;
  drHeadID?: number | null;
  donorName?: string | null;
  amount?: number | null;
  orgID?: number | null;
  orgIDReceiptNo?: number | null;
  fyID?: number | null;
  drHeadName?: string | null;
  organizationName?: string | null;
  paymentType?: string | null;
  fyName?: string | null;
}

export interface Donation extends DonationListItem {
  address?: string | null;
  panNo?: string | null;
  aadharNo?: string | null;
  mobileNo?: string | null;
  paymentTypeID?: number | null;
  transactionNo?: string | null;
  transactionDate?: string | null;
  depositDate?: string | null;
  bankName?: string | null;
  ledgerHeadBankID?: number | null;
  depositBankName?: string | null;
  remark?: string | null;
  userID?: number | null;
}

export const CASH_PAYMENT_TYPE_ID = 1;

export interface DRHeadDefine {
  orgID: number;
  drHeadIds: number[];
}
