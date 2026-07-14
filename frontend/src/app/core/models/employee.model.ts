import { OrgOption } from './audit.model';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface CodeNameOption {
  code: number;
  name: string;
}

export interface UserRoleOption {
  userRoleID: number;
  userRoleName: string;
}

export interface EmployeeLookups {
  userRoles: UserRoleOption[];
  designations: CodeNameOption[];
  genders: CodeNameOption[];
  educations: CodeNameOption[];
  documents: CodeNameOption[];
  qualificationTypes: CodeNameOption[];
  educationStatuses: CodeNameOption[];
}

export interface EmployeeLookupsBundle {
  lookups: EmployeeLookups;
  orgs: OrgOption[];
}

export interface EmployeeListItem {
  userID: number;
  firstname: string;
  middleName: string;
  lastName: string;
  employeeName: string;
  employeeShortName: string;
  mobileNo1: string;
  orgID: number | null;
  organizationName: string;
  designationCode: number | null;
  designationName: string;
  userRoleID: number | null;
  userRoleName: string;
  isActive: boolean;
  displayName?: string;
}

export interface EmployeeEducationLine {
  rowId: string;
  srNo: number;
  educationCodePassExam: number | null;
  univercity: string;
  passingYear: string;
  percentage: string;
  qualificationTypeCode: number | null;
  educationStatusCode: number | null;
}

export interface EmployeeDocumentLine {
  rowId: string;
  empDocumentCode: number | null;
  empDocumentPath: string;
  selectedFileName?: string | null;
}

export interface EmployeeSchoolLine {
  rowId: string;
  srNo: number;
  orgID: number | null;
  schoolCode: number | null;
  designationCode: number | null;
  teachClass: string;
  teachSubject: string;
  schoolJoiningDate: string;
  schoolLeaveDate: string;
  sansthaTransferOrderNoAndDate: string;
  zpTransferOrderNoAndDate: string;
}

export interface EmployeeFormState {
  userID: number | null;
  schoolCode: number | null;
  orgID: number | null;
  userRoleID: number | null;
  designationCode: number | null;
  firstname: string;
  middleName: string;
  lastName: string;
  employeeName: string;
  employeeShortName: string;
  permanentAddress: string;
  localAddress: string;
  genderCode: number | null;
  dob: string;
  adharCardNo: string;
  mobileNo1: string;
  mobileNo2: string;
  emailID: string;
  panNo: string;
  remark: string;
  appUserName: string;
  appPassword: string;
  isActive: boolean;
  education: EmployeeEducationLine[];
  documents: EmployeeDocumentLine[];
  schools: EmployeeSchoolLine[];
}
