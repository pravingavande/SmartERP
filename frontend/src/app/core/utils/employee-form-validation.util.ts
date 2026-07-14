import { EmployeeFormState } from '../models/employee.model';
import { buildEmployeeName } from './employee-name.util';

/**
 * Mirrors employee-entry basic-step validation (firstname, mobile, org).
 */
export function validateEmployeeBasicStep(form: EmployeeFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.firstname?.trim()) errors['firstname'] = 'First name is required.';
  if (!form.mobileNo1?.trim()) errors['mobileNo1'] = 'Mobile no is required.';
  if (!form.orgID) errors['orgID'] = 'Org / School is required.';
  return errors;
}

export function resolveEmployeeDisplayName(form: EmployeeFormState): string {
  return form.employeeName?.trim()
    || buildEmployeeName(form.firstname, form.middleName, form.lastName)
    || 'Employee';
}
