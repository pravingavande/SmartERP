import { TEACHER_STAFF_TYPE_ID, TeacherFormState } from '../models/teacher.model';
import { buildEmployeeName } from './employee-name.util';
import {
  mapTeacherBackendMessageToFieldErrors,
  validateTeacherForm,
  validateTeacherPhoto
} from './teacher-validation.util';

function validForm(): TeacherFormState {
  return {
    userID: null,
    srNo: 1,
    orgID: 1,
    staffTypeID: TEACHER_STAFF_TYPE_ID,
    userRoleID: 3,
    designationCode: 1,
    firstname: 'Ramesh',
    middleName: 'Kumar',
    lastName: 'Patil',
    employeeName: '',
    employeeShortName: 'R.P.',
    permanentAddress: 'Pune',
    cityName: 'Pune',
    photoPath: '',
    photoPreviewUrl: null,
    genderCode: 1,
    dob: '1985-05-10',
    adharCardNo: '123456789012',
    nationalCode: '',
    agid: null,
    shalarthID: 'SH-1',
    scaleOfPay: 'Level 1',
    casteName: 'Maratha',
    religionID: 1,
    categoryID: 1,
    bloodGroupID: 1,
    mobileNo1: '9876543210',
    mobileNo2: '',
    emailID: 'ramesh@school.edu',
    panNo: 'ABCDE1234F',
    remark: '',
    subjectName1: 'Math',
    subjectName2: 'Science',
    subjectName3: '',
    sQualification: 'B.Ed',
    bQualification: 'M.Sc',
    afterDegreePassedSubjects: 'Physics',
    sansthaOrderNoAndDate: '',
    zpOrderNoAndDate: '',
    sansthaServiceOrderNoAndDate: '',
    zpServiceOrderNoAndDate: '',
    dateOfWorkingStart: '2010-06-01',
    doWSCurrentSchool: '2010-06-01',
    jtCategoryID: 1,
    paymentGradeDate: '',
    nivadGradeDate: '',
    retirementYear: 2045,
    serviceOutDate: '',
    shiftID: 1,
    appUserName: 'ramesh',
    appPassword: 'secret',
    closeFlag: false,
    isActive: true,
    createdDate: '',
    modifiedDate: '',
    createdUserID: null,
    modifiedUserID: null,
    documents: [{ rowId: 'doc-1', empDocumentCode: null, empDocumentPath: '', selectedFileName: null }],
    schools: [{
      rowId: 'sch-1',
      srNo: 1,
      orgID: null,
      schoolCode: null,
      designationCode: null,
      teachClass: '',
      teachSubject: '',
      schoolJoiningDate: '',
      schoolLeaveDate: '',
      sansthaTransferOrderNoAndDate: '',
      zpTransferOrderNoAndDate: ''
    }]
  };
}

describe('teacher-validation.util', () => {
  describe('validateTeacherForm', () => {
    it('accepts a complete teacher form', () => {
      expect(Object.keys(validateTeacherForm(validForm())).length).toBe(0);
    });

    it('requires organization, names, designation, user type, gender, dropdowns, mobile', () => {
      const form = validForm();
      form.orgID = null;
      form.firstname = '';
      form.lastName = '';
      form.designationCode = null;
      form.staffTypeID = null;
      form.genderCode = null;
      form.religionID = null;
      form.categoryID = null;
      form.bloodGroupID = null;
      form.jtCategoryID = null;
      form.shiftID = null;
      form.userRoleID = null;
      form.mobileNo1 = '';
      const errors = validateTeacherForm(form);
      expect(errors['orgID']).toBeTruthy();
      expect(errors['firstname']).toBeTruthy();
      expect(errors['lastName']).toBeTruthy();
      expect(errors['designationCode']).toBeTruthy();
      expect(errors['staffTypeID']).toBeTruthy();
      expect(errors['genderCode']).toBeTruthy();
      expect(errors['religionID']).toBeTruthy();
      expect(errors['categoryID']).toBeTruthy();
      expect(errors['bloodGroupID']).toBeTruthy();
      expect(errors['jtCategoryID']).toBeTruthy();
      expect(errors['shiftID']).toBeTruthy();
      expect(errors['userRoleID']).toBeTruthy();
      expect(errors['mobileNo1']).toBeTruthy();
    });

    it('rejects non-10-digit mobile no 1', () => {
      const form = validForm();
      form.mobileNo1 = '12345';
      expect(validateTeacherForm(form)['mobileNo1']).toContain('10-digit');
    });

    it('rejects invalid mobile no 2 when provided', () => {
      const form = validForm();
      form.mobileNo2 = '999';
      expect(validateTeacherForm(form)['mobileNo2']).toContain('10-digit');
    });

    it('accepts valid mobile no 2', () => {
      const form = validForm();
      form.mobileNo2 = '9123456789';
      expect(validateTeacherForm(form)['mobileNo2']).toBeUndefined();
    });

    it('rejects invalid email', () => {
      const form = validForm();
      form.emailID = 'bad-email';
      expect(validateTeacherForm(form)['emailID']).toContain('Email ID');
    });

    it('rejects invalid aadhar', () => {
      const form = validForm();
      form.adharCardNo = '1234';
      expect(validateTeacherForm(form)['adharCardNo']).toContain('exactly 12 digits');
    });

    it('does not reject future or under-age date of birth', () => {
      const form = validForm();
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      form.dob = future.toISOString().slice(0, 10);
      expect(validateTeacherForm(form)['dob']).toBeUndefined();

      const young = new Date();
      young.setFullYear(young.getFullYear() - 10);
      form.dob = young.toISOString().slice(0, 10);
      expect(validateTeacherForm(form)['dob']).toBeUndefined();
    });

    it('rejects invalid PAN', () => {
      const form = validForm();
      form.panNo = 'INVALID';
      expect(validateTeacherForm(form)['panNo']).toContain('PAN');
    });

    it('accepts valid PAN case-insensitively', () => {
      const form = validForm();
      form.panNo = 'abcde1234f';
      expect(validateTeacherForm(form)['panNo']).toBeUndefined();
    });

    it('rejects negative retirement year', () => {
      const form = validForm();
      form.retirementYear = -5;
      expect(validateTeacherForm(form)['retirementYear']).toBeTruthy();
    });

    it('does not require employeeShortName', () => {
      const form = validForm();
      form.employeeShortName = '';
      expect(validateTeacherForm(form)['employeeShortName']).toBeUndefined();
    });

    it('requires password for new app login users', () => {
      const form = validForm();
      form.appPassword = '';
      const errors = validateTeacherForm(form, { requirePassword: true });
      expect(errors['appPassword']).toContain('Password');
    });

    it('does not require password on edit when requirePassword is false', () => {
      const form = validForm();
      form.userID = 10;
      form.appPassword = '';
      expect(validateTeacherForm(form)['appPassword']).toBeUndefined();
    });
  });

  describe('employee name preview integration', () => {
    it('builds employee name from teacher form name parts', () => {
      const form = validForm();
      expect(buildEmployeeName(form.firstname, form.middleName, form.lastName)).toBe('Ramesh Kumar Patil');
    });

    it('employeeName from API takes precedence over preview in display logic', () => {
      const form = validForm();
      form.employeeName = 'Stored Ramesh Kumar Patil';
      const display = form.employeeName?.trim()
        || buildEmployeeName(form.firstname, form.middleName, form.lastName);
      expect(display).toBe('Stored Ramesh Kumar Patil');
    });
  });

  describe('validateTeacherPhoto', () => {
    it('accepts jpg png jpeg within size limit', () => {
      const jpg = new File([new ArrayBuffer(1024)], 'photo.jpg', { type: 'image/jpeg' });
      const png = new File([new ArrayBuffer(1024)], 'photo.png', { type: 'image/png' });
      expect(validateTeacherPhoto(jpg)).toBeNull();
      expect(validateTeacherPhoto(png)).toBeNull();
    });

    it('rejects invalid photo extension', () => {
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
      expect(validateTeacherPhoto(file)).toContain('JPG');
    });

    it('rejects photo over 2 MB', () => {
      const file = new File([new ArrayBuffer(2 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
      expect(validateTeacherPhoto(file)).toContain('2 MB');
    });
  });

  describe('mapTeacherBackendMessageToFieldErrors', () => {
    it('maps organization errors', () => {
      expect(mapTeacherBackendMessageToFieldErrors('Organization is required.')['orgID']).toBeTruthy();
    });

    it('maps name and credential errors', () => {
      expect(mapTeacherBackendMessageToFieldErrors('First name is required.')['firstname']).toBeTruthy();
      expect(mapTeacherBackendMessageToFieldErrors('Last name is required.')['lastName']).toBeTruthy();
      expect(mapTeacherBackendMessageToFieldErrors('App user name must be unique.')['appUserName']).toBeTruthy();
      expect(
        mapTeacherBackendMessageToFieldErrors(
          'A teacher/employee with the same name and mobile no. 1 already exists.'
        )['mobileNo1']
      ).toBeTruthy();
      expect(mapTeacherBackendMessageToFieldErrors('Password is required for app login users.')['appPassword']).toBeTruthy();
    });

    it('maps designation user type and gender errors', () => {
      expect(mapTeacherBackendMessageToFieldErrors('Designation is required.')['designationCode']).toBeTruthy();
      expect(mapTeacherBackendMessageToFieldErrors('User type is required.')['staffTypeID']).toBeTruthy();
      expect(mapTeacherBackendMessageToFieldErrors('Gender is required.')['genderCode']).toBeTruthy();
    });

    it('falls back to _form for unknown messages', () => {
      const mapped = mapTeacherBackendMessageToFieldErrors('Unexpected server failure.');
      expect(mapped['_form']).toBe('Unexpected server failure.');
    });
  });
});
