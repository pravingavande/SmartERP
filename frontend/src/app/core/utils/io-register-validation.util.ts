import { FieldErrors } from './form-field-errors';
import { InwardFormState, OutwardFormState } from '../models/io-register.model';
import { trimText } from './master-validation.util';

export const IO_ALLOWED_FILE_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']);
export const IO_MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateInwardForm(form: InwardFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.orgID) errors['orgID'] = 'Organization is required.';
  if (!trimText(form.irDate)) errors['irDate'] = 'Inward date is required.';
  if (!trimText(form.fromWhomReceived)) errors['fromWhomReceived'] = 'From whom received is required.';
  if (!trimText(form.subject)) errors['subject'] = 'Subject is required.';
  return errors;
}

export function validateOutwardForm(form: OutwardFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.orgID) errors['orgID'] = 'Organization is required.';
  if (!trimText(form.orDate)) errors['orDate'] = 'Outward date is required.';
  if (!trimText(form.address)) errors['address'] = 'Address is required.';
  if (!trimText(form.subject)) errors['subject'] = 'Subject is required.';
  const amt = form.expensesAmt ?? 0;
  if (amt < 0) errors['expensesAmt'] = 'Expenses amount must be greater than or equal to zero.';
  return errors;
}

export function mapIoBackendMessageToFieldErrors(message?: string | null): FieldErrors {
  const errors: FieldErrors = {};
  if (!message) return errors;
  const lower = message.toLowerCase();
  if (lower.includes('organization')) errors['orgID'] = message;
  if (lower.includes('inward date')) errors['irDate'] = message;
  if (lower.includes('outward date')) errors['orDate'] = message;
  if (lower.includes('from whom')) errors['fromWhomReceived'] = message;
  if (lower.includes('address')) errors['address'] = message;
  if (lower.includes('subject')) errors['subject'] = message;
  if (lower.includes('expenses')) errors['expensesAmt'] = message;
  return errors;
}
