import { FieldErrors } from './form-field-errors';
import { AccountRegisterFormState, PartyFormState, LedgerHeadFormState } from '../models/audit.model';
import { DRHeadFormState } from '../models/donation.model';
import { LeaveTypeFormState } from '../models/leave.model';
import {
  AcademicScheduleFormState,
  CategoryFormState,
  ClassFormState,
  DesignationFormState,
  DocumentFormState,
  ItemFormState,
  ItemGroupFormState,
  StockFormState,
  SubjectFormState
} from '../models/master.model';

export function trimText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function requireText(
  value: string | null | undefined,
  fieldKey: string,
  label: string
): FieldErrors {
  return trimText(value) ? {} : { [fieldKey]: `${label} is required.` };
}

export function requireId(
  value: number | null | undefined,
  fieldKey: string,
  label: string
): FieldErrors {
  return value && value > 0 ? {} : { [fieldKey]: `${label} is required.` };
}

export function validateClassForm(form: ClassFormState): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.orgID, 'orgID', 'Organization'),
    ...requireText(form.className, 'className', 'Class name')
  };
  if (form.srNo == null || !Number.isFinite(form.srNo) || form.srNo <= 0 || !Number.isInteger(form.srNo)) {
    errors['srNo'] = 'Sr No is required and must be a positive whole number.';
  }
  return errors;
}

export function validateDocumentForm(form: DocumentFormState): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.underOrgID, 'underOrgID', 'Organization'),
    ...requireId(form.documentTypeID, 'documentTypeID', 'Document type'),
    ...requireText(form.documentName, 'documentName', 'Document name')
  };
  if (form.srNo == null || !Number.isFinite(form.srNo) || form.srNo <= 0 || !Number.isInteger(form.srNo)) {
    errors['srNo'] = 'Sr No is required and must be a positive whole number.';
  }
  return errors;
}

export function validateCategoryForm(form: CategoryFormState): FieldErrors {
  return {
    ...requireId(form.underOrgID, 'underOrgID', 'Organization'),
    ...requireText(form.categoryName, 'categoryName', 'Category name')
  };
}

export function validateSubjectForm(form: SubjectFormState): FieldErrors {
  return {
    ...requireId(form.underOrgID, 'underOrgID', 'Organization'),
    ...requireText(form.subjectName, 'subjectName', 'Subject name')
  };
}

export function validatePartyForm(form: Pick<PartyFormState, 'orgID' | 'partyName'>): FieldErrors {
  return {
    ...requireId(form.orgID, 'orgID', 'School'),
    ...requireText(form.partyName, 'partyName', 'Party name')
  };
}

export function validateLedgerHeadForm(
  form: Pick<LedgerHeadFormState, 'underOrgID' | 'ledgerHead' | 'ledgerTypeID' | 'description'>
): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.underOrgID, 'underOrgID', 'Organization'),
    ...requireText(form.ledgerHead, 'ledgerHead', 'Ledger head'),
    ...requireId(form.ledgerTypeID, 'ledgerTypeID', 'Ledger type')
  };
  if (trimText(form.description).length > 2000) {
    errors['description'] = 'Description must be 2000 characters or fewer.';
  }
  return errors;
}

export function validateAccountRegisterForm(form: AccountRegisterFormState): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.underOrgID, 'underOrgID', 'Organization'),
    ...requireText(form.accountRegister, 'accountRegister', 'Account register')
  };
  if (form.srNo == null || !Number.isFinite(form.srNo) || form.srNo <= 0 || !Number.isInteger(form.srNo)) {
    errors['srNo'] = 'Sr No is required and must be a positive whole number.';
  }
  return errors;
}

export function validateDRHeadForm(form: DRHeadFormState): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.underOrgID, 'underOrgID', 'Organization'),
    ...requireText(form.drHeadName, 'drHeadName', 'Donation head')
  };
  if (form.srNo == null || !Number.isFinite(form.srNo) || form.srNo <= 0 || !Number.isInteger(form.srNo)) {
    errors['srNo'] = 'Sr No is required and must be a positive whole number.';
  }
  return errors;
}

export function validateDesignationForm(form: DesignationFormState): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.underOrgID, 'underOrgID', 'Organization'),
    ...requireText(form.designationName, 'designationName', 'Designation name')
  };
  if (form.srNo == null || !Number.isFinite(form.srNo) || form.srNo <= 0 || !Number.isInteger(form.srNo)) {
    errors['srNo'] = 'Sr No is required and must be a positive whole number.';
  }
  if (form.leaveYear != null && (!Number.isFinite(form.leaveYear) || form.leaveYear < 0 || !Number.isInteger(form.leaveYear))) {
    errors['leaveYear'] = 'Leave year must be a valid whole number.';
  }
  return errors;
}

export function validateLeaveTypeForm(form: LeaveTypeFormState): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.underOrgID, 'underOrgID', 'Organization'),
    ...requireText(form.leaveTypeName, 'leaveTypeName', 'Leave type name')
  };
  if (form.srNo == null || !Number.isFinite(form.srNo) || form.srNo <= 0 || !Number.isInteger(form.srNo)) {
    errors['srNo'] = 'Sr No is required and must be a positive whole number.';
  }
  return errors;
}

export function validateOrgSelection(orgId: number | null | undefined): FieldErrors {
  return requireId(orgId, 'orgID', 'School');
}

export function validateItemGroupForm(form: ItemGroupFormState): FieldErrors {
  return {
    ...requireId(form.orgID, 'orgID', 'Organization'),
    ...requireText(form.itemGroupName, 'itemGroupName', 'Item group name')
  };
}

export function validateItemForm(form: ItemFormState): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.orgID, 'orgID', 'Organization'),
    ...requireId(form.itemGroupID, 'itemGroupID', 'Item group'),
    ...requireText(form.itemName, 'itemName', 'Item name')
  };
  if (form.rate == null || form.rate < 0) {
    errors['rate'] = 'Rate must be greater than or equal to zero.';
  }
  return errors;
}

export function validateStockForm(form: StockFormState): FieldErrors {
  const errors: FieldErrors = {
    ...requireId(form.orgID, 'orgID', 'Organization'),
    ...requireId(form.itemID, 'itemID', 'Item')
  };
  if (!form.qty || form.qty <= 0) {
    errors['qty'] = 'Quantity must be greater than zero.';
  }
  if (form.rate == null || form.rate < 0) {
    errors['rate'] = 'Rate must be greater than or equal to zero.';
  }
  return errors;
}

export function validateAcademicScheduleForm(form: AcademicScheduleFormState): FieldErrors {
  return {
    ...requireId(form.underOrgID, 'underOrgID', 'Org / School'),
    ...requireId(form.tMonth, 'tMonth', 'Month'),
    ...requireId(form.classID, 'classID', 'Class'),
    ...requireId(form.subjectID, 'subjectID', 'Subject'),
    ...requireId(form.weekID, 'weekID', 'Week'),
    ...requireId(form.ayID, 'ayID', 'Academic year'),
    ...requireText(form.title, 'title', 'Title')
  };
}

export function mapBackendMessageToFieldErrors(message?: string | null): FieldErrors {
  if (!message) return {};
  const text = message.toLowerCase();
  if (text.includes('subject name')) return { subjectName: message };
  if (text.includes('class name')) return { className: message };
  if (text.includes('sr no') || text.includes('srno')) return { srNo: message };
  if (text.includes('account register')) return { accountRegister: message };
  if (text.includes('donation head')) return { drHeadName: message };
  if (text.includes('item group name')) return { itemGroupName: message };
  if (text.includes('item group')) return { itemGroupID: message };
  if (text.includes('item name')) return { itemName: message };
  if (text.includes('party name')) return { partyName: message };
  if (text.includes('ledger head')) return { ledgerHead: message };
  if (text.includes('ledger type')) return { ledgerTypeID: message };
  if (text.includes('leave type')) return { leaveTypeName: message };
  if (text.includes('school') || text.includes('organization') || text.includes('org')) return { orgID: message };
  if (text.includes('under org') || text.includes('sanstha')) return { underOrgID: message };
  if (text.includes('title')) return { title: message };
  if (text.includes('quantity')) return { qty: message };
  if (text.includes('rate')) return { rate: message };
  if (text.includes('class')) return { classID: message };
  if (text.includes('subject')) return { subjectID: message };
  if (text.includes('week')) return { weekID: message };
  if (text.includes('month')) return { tMonth: message };
  if (text.includes('academic year')) return { ayID: message };
  return {};
}
