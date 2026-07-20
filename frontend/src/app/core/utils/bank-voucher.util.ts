import { FieldErrors } from './form-field-errors';
import { FyOption, LedgerHeadOption, VoucherFormState } from '../models/audit.model';

export type BankVoucherType = 'BD' | 'BW';

export const BANK_LEDGER_TYPE_IDS = [5, 6, 7, 8, 9] as const;

export function isBankVoucherType(vType: string | null | undefined): vType is BankVoucherType {
  const t = (vType ?? '').trim().toUpperCase();
  return t === 'BD' || t === 'BW';
}

/** BD increases register balance; BW decreases it (same sign rules as R / P). */
export function bankVoucherBalanceSign(vType: string | null | undefined): 1 | -1 | 0 {
  const t = (vType ?? '').trim().toUpperCase();
  if (t === 'BD' || t === 'R' || t === 'RV') return 1;
  if (t === 'BW' || t === 'P' || t === 'PV') return -1;
  return 0;
}

export function bankVoucherTitle(vType: BankVoucherType): string {
  return vType === 'BD' ? 'Bank Deposit' : 'Bank Withdraw';
}

/** Prefer Bank view heads; keep type-filter fallback for older payloads. */
export function filterBankLedgerHeads(
  ledgerHeads: LedgerHeadOption[] | null | undefined,
  bankLedgerHeads: LedgerHeadOption[] | null | undefined
): LedgerHeadOption[] {
  if (bankLedgerHeads?.length) return bankLedgerHeads;
  const heads = ledgerHeads ?? [];
  return heads.filter((h) => BANK_LEDGER_TYPE_IDS.includes((h.ledgerTypeID ?? 0) as (typeof BANK_LEDGER_TYPE_IDS)[number]));
}

export function applyVoucherToBalance(currentBalance: number, vType: string, amount: number): number {
  const sign = bankVoucherBalanceSign(vType);
  return currentBalance + sign * amount;
}

export interface BankVoucherValidateOptions {
  fyList?: FyOption[] | null;
}

export function validateBankVoucherForm(
  form: VoucherFormState,
  options: BankVoucherValidateOptions = {}
): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.orgID) errors['orgID'] = 'Organization is required.';
  if (!form.accountRegisterID) errors['accountRegisterID'] = 'Account Register is required.';
  if (!form.vDate?.trim()) errors['vDate'] = 'Transaction Date is required.';
  if (!form.fyID) errors['fyID'] = 'Financial Year is required.';

  if (form.vDate?.trim() && form.fyID) {
    const fy = (options.fyList ?? []).find((x) => x.fyID === form.fyID);
    if (fy) {
      const d = form.vDate.slice(0, 10);
      const from = (fy.fromDate ?? '').toString().slice(0, 10);
      const to = (fy.toDate ?? '').toString().slice(0, 10);
      if (from && d < from) errors['vDate'] = 'Date must be within selected FY.';
      if (to && d > to) errors['vDate'] = 'Date must be within selected FY.';
    }
  }

  const line = form.details[0];
  if (line?.ledgerHeadId == null || line.ledgerHeadId === 0) {
    errors['ledgerHeadId'] = 'Ledger Head is required.';
  }
  if (!line || !(Number(line.amount) > 0)) errors['amount'] = 'Amount must be greater than 0.';

  return errors;
}

/** Builds the single ACVoucherDetail line used for BD/BW saves. */
export function buildBankVoucherDetails(form: VoucherFormState): Array<{
  srNo: number;
  ledgerHeadId: number;
  ledgerHeadNarration: string | null;
  amount: number;
}> {
  const line = form.details[0];
  if (line?.ledgerHeadId == null || line.ledgerHeadId === 0 || !(Number(line.amount) > 0)) return [];
  return [
    {
      srNo: 1,
      ledgerHeadId: line.ledgerHeadId,
      ledgerHeadNarration: line.ledgerHeadNarration?.trim() || null,
      amount: Number(line.amount)
    }
  ];
}
