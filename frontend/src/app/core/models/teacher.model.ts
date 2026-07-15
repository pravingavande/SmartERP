import { OrgOption } from './audit.model';
import { EmployeeDocumentLine, EmployeeSchoolLine } from './employee.model';

export type TeacherDocumentLine = EmployeeDocumentLine;
export type TeacherSchoolLine = EmployeeSchoolLine;

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface CodeNameOption {
  code: number;
  name: string;
}

export interface IdNameOption {
  id: number;
  name: string;
}

export interface UserRoleOption {
  userRoleID: number;
  userRoleName: string;
}

export interface TeacherLookups {
  staffTypes: IdNameOption[];
  userRoles: UserRoleOption[];
  designations: CodeNameOption[];
  genders: CodeNameOption[];
  religions: IdNameOption[];
  categories: IdNameOption[];
  bloodGroups: IdNameOption[];
  shifts: IdNameOption[];
  documents: CodeNameOption[];
}

export interface TeacherLookupsBundle {
  lookups: TeacherLookups;
  orgs: OrgOption[];
}

export interface TeacherListFilter {
  orgId?: number | null;
  search?: string | null;
  shalarthID?: string | null;
  mobileNo?: string | null;
  designationCode?: number | null;
  subject?: string | null;
  userRoleID?: number | null;
  isActive?: boolean | null;
}

export interface TeacherListItem {
  userID: number;
  srNo: number | null;
  firstname: string;
  middleName: string;
  lastName: string;
  employeeName: string;
  employeeShortName: string;
  mobileNo1: string;
  shalarthID: string;
  orgID: number | null;
  organizationName: string;
  designationCode: number | null;
  designationName: string;
  userRoleID: number | null;
  userRoleName: string;
  staffTypeID: number | null;
  staffTypeName: string;
  subjectName1: string;
  subjectName2: string;
  subjectName3: string;
  isActive: boolean;
  photoPath: string;
  displayName?: string;
}

export interface TeacherFormState {
  userID: number | null;
  srNo: number | null;
  orgID: number | null;
  staffTypeID: number | null;
  userRoleID: number | null;
  designationCode: number | null;
  firstname: string;
  middleName: string;
  lastName: string;
  employeeName: string;
  employeeShortName: string;
  permanentAddress: string;
  cityName: string;
  photoPath: string;
  photoPreviewUrl: string | null;
  genderCode: number | null;
  dob: string;
  adharCardNo: string;
  shalarthID: string;
  scaleOfPay: string;
  casteName: string;
  religionID: number | null;
  categoryID: number | null;
  bloodGroupID: number | null;
  mobileNo1: string;
  mobileNo2: string;
  emailID: string;
  panNo: string;
  remark: string;
  subjectName1: string;
  subjectName2: string;
  subjectName3: string;
  sQualification: string;
  bQualification: string;
  afterDegreePassedSubjects: string;
  sansthaOrderNoAndDate: string;
  zpOrderNoAndDate: string;
  sansthaServiceOrderNoAndDate: string;
  zpServiceOrderNoAndDate: string;
  dateOfWorkingStart: string;
  jtCategoryID: number | null;
  paymentGradeDate: string;
  nivadGradeDate: string;
  retirementYear: number | null;
  serviceOutDate: string;
  shiftID: number | null;
  appUserName: string;
  appPassword: string;
  closeFlag: boolean;
  isActive: boolean;
  createdAt: string;
  documents: TeacherDocumentLine[];
  schools: TeacherSchoolLine[];
}

export const TEACHER_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const TEACHER_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
export const TEACHER_STAFF_TYPE_ID = 2;
