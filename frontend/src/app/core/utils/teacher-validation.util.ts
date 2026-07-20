import { TeacherFormState } from '../models/teacher.model';

const MOBILE_RE = /^\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAR_RE = /^\d{12}$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/i;

/** Required number fields may use placeholder "0". */
function isAllowedMobile(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '0' || MOBILE_RE.test(trimmed);
}

/** Aadhaar may be full 12 digits, or placeholder "0" / "-". */
function isAllowedAadhar(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '0' || trimmed === '-' || AADHAR_RE.test(trimmed);
}

/** Required text may use placeholder "-". Empty still fails. */
function isFilledText(value: string | null | undefined): boolean {
  return (value?.trim().length ?? 0) > 0;
}

export function validateTeacherForm(form: TeacherFormState, options?: { requirePassword?: boolean }): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.orgID) errors['orgID'] = 'Organization is required.';
  if (!isFilledText(form.firstname)) errors['firstname'] = 'First name is required.';
  if (!isFilledText(form.lastName)) errors['lastName'] = 'Last name is required.';
  if (!form.designationCode) errors['designationCode'] = 'Please select Designation.';
  if (!form.staffTypeID) errors['staffTypeID'] = 'Please select Staff Type.';
  if (!form.agid) errors['agid'] = 'Please select Niyukticha Gut.';
  if (!form.genderCode) errors['genderCode'] = 'Please select Gender.';
  if (!form.religionID) errors['religionID'] = 'Please select Religion.';
  if (!form.categoryID) errors['categoryID'] = 'Please select Category.';
  if (!form.bloodGroupID) errors['bloodGroupID'] = 'Please select Blood Group.';
  if (!form.jtCategoryID) errors['jtCategoryID'] = 'Please select JT Category.';
  if (!form.shiftID) errors['shiftID'] = 'Please select Shift.';
  if (!form.userRoleID) errors['userRoleID'] = 'Please select User Role.';

  if (!isFilledText(form.mobileNo1)) {
    errors['mobileNo1'] = 'Mobile no. 1 is required.';
  } else if (!isAllowedMobile(form.mobileNo1)) {
    errors['mobileNo1'] = 'Mobile no. 1 must be a 10-digit number or 0.';
  }

  if (form.mobileNo2?.trim() && !isAllowedMobile(form.mobileNo2)) {
    errors['mobileNo2'] = 'Mobile no. 2 must be a 10-digit number or 0.';
  }

  if (form.emailID?.trim() && !EMAIL_RE.test(form.emailID.trim())) {
    errors['emailID'] = 'Email ID format is invalid.';
  }

  if (form.adharCardNo?.trim() && !isAllowedAadhar(form.adharCardNo)) {
    errors['adharCardNo'] = 'Aadhaar number must be 12 digits, 0, or -.';
  }

  if (form.panNo?.trim() && !PAN_RE.test(form.panNo.trim())) {
    errors['panNo'] = 'PAN no. format is invalid.';
  }

  if (form.dob?.trim()) {
    const dob = new Date(`${form.dob.trim()}T00:00:00`);
    if (Number.isNaN(dob.getTime())) {
      errors['dob'] = 'Date of birth is invalid.';
    }
  }

  if (form.retirementYear != null && (Number.isNaN(form.retirementYear) || form.retirementYear < 0)) {
    errors['retirementYear'] = 'Retirement year must be numeric.';
  }

  if (options?.requirePassword && form.appUserName?.trim() && !form.appPassword?.trim()) {
    errors['appPassword'] = 'Password is required for app login users.';
  }

  return errors;
}

export function validateTeacherPhoto(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    return 'Photo must be JPG, JPEG, or PNG.';
  }
  if (file.size > 2 * 1024 * 1024) {
    return 'Photo must be 2 MB or smaller.';
  }
  return null;
}

export function mapTeacherBackendMessageToFieldErrors(message: string): Record<string, string> {
  const lower = message.toLowerCase();
  if (lower.includes('organization')) return { orgID: message };
  if (lower.includes('first name')) return { firstname: message };
  if (lower.includes('last name')) return { lastName: message };
  if (lower.includes('designation')) return { designationCode: message };
  if (lower.includes('user type')) return { staffTypeID: message };
  if (lower.includes('niyukticha') || lower.includes('agid') || lower.includes('appointment')) return { agid: message };
  if (lower.includes('gender')) return { genderCode: message };
  if (lower.includes('religion')) return { religionID: message };
  if (lower.includes('blood')) return { bloodGroupID: message };
  if (lower.includes('category') && lower.includes('jt')) return { jtCategoryID: message };
  if (lower.includes('category')) return { categoryID: message };
  if (lower.includes('shift')) return { shiftID: message };
  if (lower.includes('user role') || lower.includes('role')) return { userRoleID: message };
  if (lower.includes('mobile')) return { mobileNo1: message };
  if (lower.includes('email')) return { emailID: message };
  if (lower.includes('aadhar') || lower.includes('aadhaar')) return { adharCardNo: message };
  if (lower.includes('pan')) return { panNo: message };
  if (lower.includes('password')) return { appPassword: message };
  if (lower.includes('user name')) return { appUserName: message };
  if (lower.includes('retirement')) return { retirementYear: message };
  return { _form: message };
}
