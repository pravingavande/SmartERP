import { TEACHER_STAFF_TYPE_ID, TeacherFormState } from '../models/teacher.model';
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
    middleName: '',
    lastName: 'Patil',
    permanentAddress: 'Pune',
    cityName: 'Pune',
    photoPath: '',
    photoPreviewUrl: null,
    genderCode: 1,
    dob: '1985-05-10',
    adharCardNo: '123456789012',
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
    subjectName2: '',
    subjectName3: '',
    sQualification: 'B.Ed',
    bQualification: 'M.Sc',
    afterDegreePassedSubjects: 'Physics',
    sansthaOrderNoAndDate: '',
    zpOrderNoAndDate: '',
    sansthaServiceOrderNoAndDate: '',
    zpServiceOrderNoAndDate: '',
    dateOfWorkingStart: '2010-06-01',
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
    createdAt: ''
  };
}

describe('teacher-validation.util', () => {
  it('accepts a complete teacher form', () => {
    expect(Object.keys(validateTeacherForm(validForm())).length).toBe(0);
  });

  it('requires organization, names, designation, user type, gender, mobile', () => {
    const form = validForm();
    form.orgID = null;
    form.firstname = '';
    form.lastName = '';
    form.designationCode = null;
    form.staffTypeID = null;
    form.genderCode = null;
    form.mobileNo1 = '';
    const errors = validateTeacherForm(form);
    expect(errors['orgID']).toBeTruthy();
    expect(errors['firstname']).toBeTruthy();
    expect(errors['lastName']).toBeTruthy();
    expect(errors['designationCode']).toBeTruthy();
    expect(errors['staffTypeID']).toBeTruthy();
    expect(errors['genderCode']).toBeTruthy();
    expect(errors['mobileNo1']).toBeTruthy();
  });

  it('requires password for new app login users', () => {
    const form = validForm();
    form.appPassword = '';
    const errors = validateTeacherForm(form, { requirePassword: true });
    expect(errors['appPassword']).toContain('Password');
  });

  it('rejects invalid photo extension', () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    expect(validateTeacherPhoto(file)).toContain('JPG');
  });

  it('maps backend messages to field keys', () => {
    expect(mapTeacherBackendMessageToFieldErrors('Organization is required.')['orgID']).toBeTruthy();
    expect(mapTeacherBackendMessageToFieldErrors('App user name must be unique.')['appUserName']).toBeTruthy();
  });
});
