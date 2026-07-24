import { DONATION_REPORTS } from './donation-report.model';

export type HubReportCategory = 'donation' | 'accounts' | 'audit' | 'school' | 'stock' | 'io';

export type HubReportFilterMode =
  | 'none'
  | 'school'
  | 'school-required'
  | 'sanstha'
  | 'school-or-sanstha'
  | 'ledger-head'
  | 'ledger-head-date-range'
  | 'date-range'
  | 'school-and-item-group';

export interface HubReportDefinition {
  id: string;
  category: HubReportCategory;
  titleEn: string;
  titleMr: string;
  description: string;
  endpoint: string;
  filterMode: HubReportFilterMode;
  requireSchool: boolean;
  showDonationHead: boolean;
  showPaymentType: boolean;
  showMinAmount: boolean;
}

export const ACCOUNT_REPORTS: HubReportDefinition[] = [
  {
    id: 'cash-book',
    category: 'accounts',
    titleEn: 'Cash Book Report',
    titleMr: 'मुख्य किर्द रिपोर्ट',
    description: 'School-wise cash book with monthly opening and closing balances.',
    endpoint: '/reports/cash-book/pdf',
    filterMode: 'date-range',
    requireSchool: true,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  }
];

export const AUDIT_REPORTS: HubReportDefinition[] = [
  {
    id: 'voucher-ledger',
    category: 'audit',
    titleEn: 'Voucher Ledger Report',
    titleMr: 'व्हाऊचर लेजर रिपोर्ट',
    description: 'Voucher transactions by ledger head, sorted by voucher date and number.',
    endpoint: '/reports/audit/voucher-ledger/pdf',
    filterMode: 'ledger-head-date-range',
    requireSchool: true,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  },
  {
    id: 'trial-balance',
    category: 'audit',
    titleEn: 'Trial Balance',
    titleMr: 'तेरीज पत्रक',
    description: 'Trial balance grouped by ledger head with opening, debit, credit and closing.',
    endpoint: '/reports/audit/trial-balance/pdf',
    filterMode: 'school-required',
    requireSchool: true,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  }
];

export const SCHOOL_REPORTS: HubReportDefinition[] = [
  {
    id: 'school-college-list',
    category: 'school',
    titleEn: 'School / College Report',
    titleMr: 'शाळा/कॉलेज यादी',
    description: 'Complete school and college details for the selected sanstha.',
    endpoint: '/reports/school/details/pdf',
    filterMode: 'sanstha',
    requireSchool: false,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  },
  {
    id: 'employee-list',
    category: 'school',
    titleEn: 'School/College/Sanstha Wise Employee Report',
    titleMr: 'शाळा/कॉलेज/संस्था अंतर्गत कर्मचारी यादी',
    description: 'Employees belonging to the selected school or sanstha.',
    endpoint: '/reports/school/employees/pdf',
    filterMode: 'school-or-sanstha',
    requireSchool: false,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  },
  {
    id: 'employee-seniority',
    category: 'school',
    titleEn: 'Employee Seniority Report',
    titleMr: 'कर्मचारी सेवाज्येष्ठता यादी',
    description: 'Employees sorted by appointment / joining date in ascending order.',
    endpoint: '/reports/school/employees-seniority/pdf',
    filterMode: 'school-or-sanstha',
    requireSchool: false,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  },
  {
    id: 'employee-retired',
    category: 'school',
    titleEn: 'Retired Employee Report',
    titleMr: 'कर्मचारी सेवानिवृत्त यादी',
    description: 'Retired employees for the selected school or sanstha.',
    endpoint: '/reports/school/employees-retired/pdf',
    filterMode: 'school-or-sanstha',
    requireSchool: false,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  }
];

export const IO_REPORTS: HubReportDefinition[] = [
  {
    id: 'inward-register',
    category: 'io',
    titleEn: 'Inward Register Report',
    titleMr: 'आवक रजिस्टर अहवाल',
    description: 'Inward register entries sorted by inward date.',
    endpoint: '/reports/school/inward-register/pdf',
    filterMode: 'date-range',
    requireSchool: false,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  },
  {
    id: 'outward-register',
    category: 'io',
    titleEn: 'Outward Register Report',
    titleMr: 'जावक रजिस्टर अहवाल',
    description: 'Outward register entries sorted by outward date.',
    endpoint: '/reports/school/outward-register/pdf',
    filterMode: 'date-range',
    requireSchool: false,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  }
];

export const STOCK_REPORTS: HubReportDefinition[] = [
  {
    id: 'stock-register',
    category: 'stock',
    titleEn: 'Stock Register',
    titleMr: 'स्टॉक रजिस्टर',
    description: 'Stock register with opening, inward, outward and closing quantities.',
    endpoint: '/reports/stock/register/pdf',
    filterMode: 'school-and-item-group',
    requireSchool: true,
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  }
];

export const HUB_REPORTS: HubReportDefinition[] = [
  ...DONATION_REPORTS.map((r): HubReportDefinition => ({
    id: r.id,
    category: 'donation',
    titleEn: r.titleEn,
    titleMr: r.titleMr,
    description: r.description,
    endpoint: r.endpoint,
    filterMode: 'date-range',
    requireSchool: false,
    showDonationHead: r.showDonationHead,
    showPaymentType: r.showPaymentType,
    showMinAmount: r.showMinAmount
  })),
  ...ACCOUNT_REPORTS,
  ...AUDIT_REPORTS,
  ...SCHOOL_REPORTS,
  ...IO_REPORTS,
  ...STOCK_REPORTS
];
