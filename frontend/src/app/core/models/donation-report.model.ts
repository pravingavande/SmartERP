export type DonationReportKind = 'detail' | 'school-wise' | 'user-wise';

export interface DonationReportFilter {
  orgId: number | null;
  drHeadId: number | null;
  paymentTypeId: number | null;
  minAmount: number | null;
  fromDate: string;
  toDate: string;
}

export interface DonationReportDefinition {
  id: DonationReportKind;
  titleEn: string;
  titleMr: string;
  description: string;
  endpoint: string;
  showDonationHead: boolean;
  showPaymentType: boolean;
  showMinAmount: boolean;
}

export const DONATION_REPORTS: DonationReportDefinition[] = [
  {
    id: 'detail',
    titleEn: 'Donation Detail Report',
    titleMr: 'देणगी विवरण रिपोर्ट',
    description: 'School, donation head, payment type, amount and date wise donation details.',
    endpoint: '/reports/donation/detail/pdf',
    showDonationHead: true,
    showPaymentType: true,
    showMinAmount: true
  },
  {
    id: 'school-wise',
    titleEn: 'School / College / Sanstha Wise Donation Detail Report',
    titleMr: 'शाळा/कॉलेज/संस्था प्रमाणे देणगी विवरण रिपोर्ट',
    description: 'Donation line items grouped with school and user details.',
    endpoint: '/reports/donation/school-wise/pdf',
    showDonationHead: true,
    showPaymentType: true,
    showMinAmount: true
  },
  {
    id: 'user-wise',
    titleEn: 'User Wise Donation Detail Report',
    titleMr: 'युजर प्रमाणे देणगी विवरण रिपोर्ट',
    description: 'Summary by user with total receipts and amount.',
    endpoint: '/reports/donation/user-wise/pdf',
    showDonationHead: false,
    showPaymentType: false,
    showMinAmount: false
  }
];
