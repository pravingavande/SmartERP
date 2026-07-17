import { DONATION_REPORTS } from './donation-report.model';

export type HubReportCategory = 'donation' | 'accounts';

export interface HubReportDefinition {
  id: string;
  category: HubReportCategory;
  titleEn: string;
  titleMr: string;
  description: string;
  endpoint: string;
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
    requireSchool: false,
    showDonationHead: r.showDonationHead,
    showPaymentType: r.showPaymentType,
    showMinAmount: r.showMinAmount
  })),
  ...ACCOUNT_REPORTS
];
