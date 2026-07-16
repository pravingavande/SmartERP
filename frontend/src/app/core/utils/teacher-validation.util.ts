import { TeacherFormState } from '../models/teacher.model';

const MOBILE_RE = /^\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAR_RE = /^\d{12}$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/i;
export const TEACHER_MIN_AGE = 18;
export const TEACHER_MAX_AGE = 70;

function ageFromDob(dobIso: string, today = new Date()): number {
  const dob = new Date(`${dobIso}T00:00:00`);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function validateTeacherForm(form: TeacherFormState, options?: { requirePassword?: boolean }): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.orgID) errors['orgID'] = 'Organization is required.';
  if (!form.firstname?.trim()) errors['firstname'] = 'First name is required.';
  if (!form.lastName?.trim()) errors['lastName'] = 'Last name is required.';
  if (!form.designationCode) errors['designationCode'] = 'Please select Designation.';
  if (!form.staffTypeID) errors['staffTypeID'] = 'Please select Staff Type.';
  if (!form.genderCode) errors['genderCode'] = 'Please select Gender.';

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dob = new Date(`${form.dob.trim()}T00:00:00`);
    if (Number.isNaN(dob.getTime())) {
      errors['dob'] = 'Date of birth is invalid.';
    } else if (dob > today) {
      errors['dob'] = 'Future date is not allowed for Date of Birth.';
    } else {
      const age = ageFromDob(form.dob.trim(), today);
      if (age < TEACHER_MIN_AGE || age > TEACHER_MAX_AGE) {
        errors['dob'] = `Age must be between ${TEACHER_MIN_AGE} and ${TEACHER_MAX_AGE} years.`;
      }
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
  if (lower.includes('mobile')) return { mobileNo1: message };
  if (lower.includes('email')) return { emailID: message };
  if (lower.includes('aadhar')) return { adharCardNo: message };
  if (lower.includes('pan')) return { panNo: message };
  if (lower.includes('password')) return { appPassword: message };
  if (lower.includes('user name')) return { appUserName: message };
  if (lower.includes('retirement')) return { retirementYear: message };
  return { _form: message };
}
