import { EmployeeFormState } from '../models/employee.model';
import { buildEmployeeName } from './employee-name.util';
import { resolveEmployeeDisplayName, validateEmployeeBasicStep } from './employee-form-validation.util';

function validEmployeeForm(): EmployeeFormState {
  return {
    userID: null,
    schoolCode: null,
    orgID: 1,
    userRoleID: 3,
    designationCode: 1,
    firstname: 'Ramesh',
    middleName: 'Kumar',
    lastName: 'Patil',
    employeeName: '',
    employeeShortName: 'R.P.',
    permanentAddress: 'Pune',
    localAddress: '',
    genderCode: 1,
    dob: '1985-01-01',
    adharCardNo: '',
    mobileNo1: '9876543210',
    mobileNo2: '',
    emailID: '',
    panNo: '',
    remark: '',
    appUserName: '',
    appPassword: '',
    isActive: true,
    education: [],
    documents: [],
    schools: []
  };
}

describe('employee-form-validation.util', () => {
  describe('validateEmployeeBasicStep', () => {
    it('accepts valid basic employee form', () => {
      expect(Object.keys(validateEmployeeBasicStep(validEmployeeForm())).length).toBe(0);
    });

    it('requires firstname, mobile and org', () => {
      const form = validEmployeeForm();
      form.firstname = '';
      form.mobileNo1 = '';
      form.orgID = null;
      const errors = validateEmployeeBasicStep(form);
      expect(errors['firstname']).toBeTruthy();
      expect(errors['mobileNo1']).toBeTruthy();
      expect(errors['orgID']).toBeTruthy();
    });

    it('does not validate employeeShortName on basic step', () => {
      const form = validEmployeeForm();
      form.employeeShortName = '';
      expect(validateEmployeeBasicStep(form)['employeeShortName']).toBeUndefined();
    });
  });

  describe('resolveEmployeeDisplayName', () => {
    it('uses stored employeeName when present', () => {
      const form = validEmployeeForm();
      form.employeeName = 'Stored Full Name';
      expect(resolveEmployeeDisplayName(form)).toBe('Stored Full Name');
    });

    it('builds name from parts when employeeName is empty', () => {
      const form = validEmployeeForm();
      expect(resolveEmployeeDisplayName(form)).toBe('Ramesh Kumar Patil');
    });

    it('falls back to Employee label when all names empty', () => {
      const form = validEmployeeForm();
      form.firstname = '';
      form.middleName = '';
      form.lastName = '';
      form.employeeName = '';
      expect(resolveEmployeeDisplayName(form)).toBe('Employee');
    });
  });

  describe('buildEmployeeName with employee form', () => {
    it('matches preview used in employee entry component', () => {
      const form = validEmployeeForm();
      expect(buildEmployeeName(form.firstname, form.middleName, form.lastName)).toBe('Ramesh Kumar Patil');
    });
  });
});
