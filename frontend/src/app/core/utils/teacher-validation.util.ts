import { TeacherFormState } from '../models/teacher.model';

const MOBILE_RE = /^\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAR_RE = /^\d{12}$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/i;

export function validateTeacherForm(form: TeacherFormState, options?: { requirePassword?: boolean }): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.orgID) errors['orgID'] = 'Organization is required.';
  if (!form.firstname?.trim()) errors['firstname'] = 'First name is required.';
  if (!form.lastName?.trim()) errors['lastName'] = 'Last name is required.';
  if (!form.designationCode) errors['designationCode'] = 'Please select Designation.';
  if (!form.staffTypeID) errors['staffTypeID'] = 'Please select Staff Type.';
  if (!form.genderCode) errors['genderCode'] = 'Please select Gender.';
  if (!form.religionID) errors['religionID'] = 'Please select Religion.';
  if (!form.categoryID) errors['categoryID'] = 'Please select Category.';
  if (!form.bloodGroupID) errors['bloodGroupID'] = 'Please select Blood Group.';
  if (!form.jtCategoryID) errors['jtCategoryID'] = 'Please select JT Category.';
  if (!form.shiftID) errors['shiftID'] = 'Please select Shift.';
  if (!form.userRoleID) errors['userRoleID'] = 'Please select User Role.';

  if (!form.mobileNo1?.trim()) {
    errors['mobileNo1'] = 'Mobile no. 1 is required.';
  } else if (!MOBILE_RE.test(form.mobileNo1.trim())) {
    errors['mobileNo1'] = 'Mobile no. 1 must be a 10-digit number.';
  }

  if (form.mobileNo2?.trim() && !MOBILE_RE.test(form.mobileNo2.trim())) {
    errors['mobileNo2'] = 'Mobile no. 2 must be a 10-digit number.';
  }

  if (form.emailID?.trim() && !EMAIL_RE.test(form.emailID.trim())) {
    errors['emailID'] = 'Email ID format is invalid.';
  }

  if (form.adharCardNo?.trim()) {
    if (!AADHAR_RE.test(form.adharCardNo.trim())) {
      errors['adharCardNo'] = 'Aadhaar number must be exactly 12 digits.';
    }
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
  if (lower.includes('gender')) return { genderCode: message };
  if (lower.includes('religion')) return { religionID: message };
  if (lower.includes('blood')) return { bloodGroupID: message };
  if (lower.includes('category') && lower.includes('jt')) return { jtCategoryID: message };
  if (lower.includes('category')) return { categoryID: message };
  if (lower.includes('shift')) return { shiftID: message };
  if (lower.includes('user role') || lower.includes('role')) return { userRoleID: message };
  if (lower.includes('mobile')) return { mobileNo1: message };
  if (lower.includes('email')) return { emailID: message };
  if (lower.includes('aadhar')) return { adharCardNo: message };
  if (lower.includes('pan')) return { panNo: message };
  if (lower.includes('password')) return { appPassword: message };
  if (lower.includes('user name')) return { appUserName: message };
  if (lower.includes('retirement')) return { retirementYear: message };
  return { _form: message };
}
