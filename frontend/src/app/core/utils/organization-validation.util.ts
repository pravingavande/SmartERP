import { FieldErrors } from './form-field-errors';
import { OrganizationFormState, SANSTHA_BUSINESS_CATEGORY_ID, SCHOOL_BUSINESS_CATEGORY_ID } from '../models/organization.model';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
const mobileRegex = /^\d{10}$/;
const phoneRegex = /^\d+$/;
const yearRegex = /^\d{4}$/;

export function validateOrganizationForm(form: OrganizationFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.businessCategoryID || form.businessCategoryID <= 0) {
    errors['businessCategoryID'] = 'Business Category is required.';
  }

  if (!form.organizationName?.trim()) {
    errors['organizationName'] = 'Organization Name is required.';
  }

  if (!form.schoolCategoryID || form.schoolCategoryID <= 0) {
    errors['schoolCategoryID'] = 'School Category is required.';
  }

  if (form.businessCategoryID === SCHOOL_BUSINESS_CATEGORY_ID && (!form.underOrgID || form.underOrgID <= 0)) {
    errors['underOrgID'] = 'Org / School is required.';
  }

  if (form.emailID?.trim() && !emailRegex.test(form.emailID.trim())) {
    errors['emailID'] = 'Enter a valid email address.';
  }

  if (form.mobileNo?.trim() && !mobileRegex.test(form.mobileNo.trim())) {
    errors['mobileNo'] = 'Mobile number must be exactly 10 digits.';
  }

  if (form.phoneNo?.trim() && !phoneRegex.test(form.phoneNo.trim())) {
    errors['phoneNo'] = 'Phone number must be numeric.';
  }

  if (form.panNo?.trim() && !panRegex.test(form.panNo.trim())) {
    errors['panNo'] = 'Enter a valid PAN number.';
  }

  if (form.establishmentYear?.trim()) {
    const yearText = form.establishmentYear.trim();
    if (!yearRegex.test(yearText)) {
      errors['establishmentYear'] = 'Establishment year must be 4 digits.';
    } else {
      const year = Number(yearText);
      const currentYear = new Date().getFullYear();
      if (year > currentYear) {
        errors['establishmentYear'] = `Establishment year cannot be greater than ${currentYear}.`;
      } else if (year < 1800) {
        errors['establishmentYear'] = 'Establishment year is invalid.';
      }
    }
  }

  if (form.webSite?.trim()) {
    try {
      const url = form.webSite.trim();
      if (!/^https?:\/\//i.test(url)) {
        new URL(`https://${url}`);
      } else {
        new URL(url);
      }
    } catch {
      errors['webSite'] = 'Enter a valid website URL.';
    }
  }

  return errors;
}

export function mapOrganizationBackendMessage(message: string): FieldErrors {
  const lower = message.toLowerCase();
  if (lower.includes('business category')) return { businessCategoryID: message };
  if (lower.includes('organization name')) return { organizationName: message };
  if (lower.includes('school category')) return { schoolCategoryID: message };
  if (lower.includes('under sanstha') || lower.includes('under org')) return { underOrgID: message };
  if (lower.includes('email')) return { emailID: message };
  if (lower.includes('mobile')) return { mobileNo: message };
  if (lower.includes('phone')) return { phoneNo: message };
  if (lower.includes('pan')) return { panNo: message };
  if (lower.includes('website') || lower.includes('url')) return { webSite: message };
  if (lower.includes('establishment')) return { establishmentYear: message };
  return {};
}

export function isSansthaCategory(businessCategoryId: number | null | undefined): boolean {
  return businessCategoryId === SANSTHA_BUSINESS_CATEGORY_ID;
}
