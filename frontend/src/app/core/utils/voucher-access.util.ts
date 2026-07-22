import { isSameCalendarDay, todayIsoDate } from './date.util';

/** School-level user — edit/delete payment & receipt vouchers only on voucher date = today. */
export const EMPLOYEE_USER_ROLE_ID = 3;

export function isPaymentOrReceiptVoucherType(vType: string | null | undefined): boolean {
  const normalized = (vType ?? '').trim().toUpperCase();
  return normalized === 'P' || normalized === 'PV' || normalized === 'R' || normalized === 'RV';
}

/** UserRole 2 (and other non-employee roles) may always modify; role 3 only when voucher date is today. */
export function canEmployeeModifyVoucherOnDate(
  userRoleId: number | null | undefined,
  voucherDate: string | null | undefined,
  todayIso = todayIsoDate()
): boolean {
  if (userRoleId !== EMPLOYEE_USER_ROLE_ID) return true;
  return isSameCalendarDay(voucherDate, todayIso);
}

export function canModifyPaymentReceiptVoucher(
  userRoleId: number | null | undefined,
  vType: string | null | undefined,
  voucherDate: string | null | undefined,
  todayIso = todayIsoDate()
): boolean {
  if (!isPaymentOrReceiptVoucherType(vType)) return true;
  return canEmployeeModifyVoucherOnDate(userRoleId, voucherDate, todayIso);
}
