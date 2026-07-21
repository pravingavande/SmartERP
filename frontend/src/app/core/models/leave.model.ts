import { OrgOption } from './audit.model';

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
}

export interface LeaveTypeItem {
  leaveTypeID: number;
  underOrgID: number;
  srNo: number;
  leaveTypeName: string;
  isActive: boolean;
  organizationName?: string;
}

export interface LeaveTypeFormState {
  leaveTypeID: number | null;
  underOrgID: number | null;
  srNo: number | null;
  leaveTypeName: string;
  isActive: boolean;
}

export interface ImportLeaveTypeResult {
  importedCount: number;
  skippedCount: number;
}

export interface LeaveOption {
  id: number;
  name: string;
}

export interface AyOption {
  ayID: number;
  ayName: string;
  fromDate?: string;
  toDate?: string;
}

export interface LeaveApplyLookups {
  leaveTypes: LeaveOption[];
  leavePermissions: LeaveOption[];
  ayList: AyOption[];
}

export interface LeaveApplyLookupsBundle {
  orgs: OrgOption[];
  lookups: LeaveApplyLookups;
}

export interface EmployeeOption {
  userID: number;
  displayName: string;
  mobileNo1?: string;
}

export interface LeaveApplyListItem {
  userLeaveApplyID: number;
  orgID?: number | null;
  organizationName?: string;
  recordNo?: number | null;
  tDate?: string | null;
  userID?: number | null;
  firstname?: string;
  middleName?: string;
  lastName?: string;
  leaveTypeID?: number | null;
  leaveTypeName?: string;
  leaveReason?: string;
  fromDate?: string | null;
  toDate?: string | null;
  noOfDay?: number | null;
  adminRemak?: string;
  leavePermissionID?: number | null;
  leavePermissionName?: string;
  ayID?: number | null;
  ayName?: string;
  displayName?: string;
}

export interface LeaveApplyFormState {
  userLeaveApplyID: number | null;
  orgID: number | null;
  recordNo: number | null;
  tDate: string;
  userID: number | null;
  leaveTypeID: number | null;
  leaveReason: string;
  fromDate: string;
  toDate: string;
  noOfDay: number | null;
  adminRemak: string;
  leavePermissionID: number | null;
  ayID: number | null;
}
