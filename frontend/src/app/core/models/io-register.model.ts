import { OrgOption } from './audit.model';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface YearIoOption {
  yioID: number;
  yearName: string;
  yearLabel?: string | null;
  isActive: boolean;
}

export interface IoLookups {
  orgs: OrgOption[];
  years: YearIoOption[];
  activeYear?: YearIoOption | null;
}

export interface NextRecordNo {
  nextRecordNo: number;
  yioID: number;
}

export interface InwardRegisterItem {
  irid: number;
  orgID: number;
  recordNo: number;
  irDate: string;
  fileNo?: string | null;
  letterNo?: string | null;
  fromWhomReceived: string;
  subject: string;
  toWhomIssued?: string | null;
  remark?: string | null;
  attachmentPath?: string | null;
  yioID: number;
  organizationName?: string | null;
  yearName?: string | null;
}

export interface OutwardRegisterItem {
  orid: number;
  orgID: number;
  recordNo: number;
  orDate: string;
  enclosures?: string | null;
  address: string;
  subject: string;
  fileNo?: string | null;
  orrDate?: string | null;
  expensesAmt: number;
  remark?: string | null;
  attachmentPath?: string | null;
  yioID: number;
  organizationName?: string | null;
  yearName?: string | null;
}

export interface InwardFilter {
  orgID: number;
  yioID?: number | null;
  recordNo?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  fileNo?: string | null;
  letterNo?: string | null;
  subject?: string | null;
  fromWhomReceived?: string | null;
  search?: string | null;
}

export interface OutwardFilter {
  orgID: number;
  yioID?: number | null;
  recordNo?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  fileNo?: string | null;
  subject?: string | null;
  address?: string | null;
  search?: string | null;
}

export interface InwardFormState {
  irid: number | null;
  orgID: number | null;
  recordNo: number | null;
  irDate: string;
  fileNo: string;
  letterNo: string;
  fromWhomReceived: string;
  subject: string;
  toWhomIssued: string;
  remark: string;
  attachmentPath: string;
  yioID: number | null;
  yearName?: string | null;
}

export interface OutwardFormState {
  orid: number | null;
  orgID: number | null;
  recordNo: number | null;
  orDate: string;
  enclosures: string;
  address: string;
  subject: string;
  fileNo: string;
  orrDate: string;
  expensesAmt: number | null;
  remark: string;
  attachmentPath: string;
  yioID: number | null;
  yearName?: string | null;
}
