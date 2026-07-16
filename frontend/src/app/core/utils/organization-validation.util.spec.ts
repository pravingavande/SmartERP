import { validateOrganizationForm } from './organization-validation.util';
import { OrganizationFormState, SCHOOL_BUSINESS_CATEGORY_ID } from '../models/organization.model';

function baseForm(overrides: Partial<OrganizationFormState> = {}): OrganizationFormState {
  return {
    orgID: null,
    businessCategoryID: SCHOOL_BUSINESS_CATEGORY_ID,
    underOrgID: 3,
    srNo: null,
    schoolCategoryID: 2,
    organizationName: 'Test School',
    address: '',
    cityName: '',
    udiesNo: '',
    schoolTinNo: '',
    sharlarthID: '',
    panNo: '',
    emailID: '',
    phoneNo: '',
    mobileNo: '9876543210',
    webSite: '',
    establishmentYear: '',
    regNo: '',
    permission80G: '',
    remark: '',
    isActive: true,
    documents: [],
    ...overrides
  };
}

describe('validateOrganizationForm', () => {
  it('accepts valid school form', () => {
    expect(validateOrganizationForm(baseForm())).toEqual({});
  });

  it('rejects missing business category', () => {
    const errors = validateOrganizationForm(baseForm({ businessCategoryID: null }));
    expect(errors['businessCategoryID']).toContain('Business Category');
  });

  it('rejects school without under sanstha', () => {
    const errors = validateOrganizationForm(baseForm({ underOrgID: null }));
    expect(errors['underOrgID']).toContain('Org / School');
  });

  it('rejects invalid email', () => {
    const errors = validateOrganizationForm(baseForm({ emailID: 'not-an-email' }));
    expect(errors['emailID']).toContain('valid email');
  });

  it('rejects invalid PAN', () => {
    const errors = validateOrganizationForm(baseForm({ panNo: 'BADPAN' }));
    expect(errors['panNo']).toContain('PAN');
  });
});
