export interface HubReportFilter {
  orgId: number | null;
  sansthaId: number | null;
  drHeadId: number | null;
  paymentTypeId: number | null;
  minAmount: number | null;
  ledgerHeadId: number | null;
  allLedgerHeads: boolean;
  itemGroupId: number | null;
  fromDate: string;
  toDate: string;
}
