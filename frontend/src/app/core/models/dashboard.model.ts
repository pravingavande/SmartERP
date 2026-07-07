export interface UserProfile {
  userId: number;
  userName: string;
  displayName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  mobileNo1?: string;
  mobileNo2?: string;
  schoolCode?: number;
  orgId?: number;
  sansthaName?: string;
  schoolName?: string;
  designationName?: string;
  designationCode?: number;
  userTypeId?: number;
  genderCode?: number;
  dateOfBirth?: string;
  panNo?: string;
  shalarthId?: string;
  roleCode: string;
  isActive: boolean;
}

export interface DashboardSummary {
  sansthaName: string;
  totalSchool: number;
  totalStudent: number;
  totalTeacher: number;
  teachingStaff: number;
  nonTeachingStaff: number;
  permanentStaff: number;
  temporaryStaff: number;
  maleStudents: number;
  femaleStudents: number;
  maleTeachers: number;
  femaleTeachers: number;
}

export interface NoticeItem {
  tid: number;
  noticeDate: string;
  title: string;
  attachment?: string;
  isNew: boolean;
}
