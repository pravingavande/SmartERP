import { OrgOption } from './audit.model';

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
}

export interface ClassMasterItem {
  classID: number;
  orgID: number;
  srNo: number;
  className: string;
  isActive: boolean;
  organizationName?: string | null;
}

export interface ClassFormState {
  classID: number | null;
  orgID: number | null;
  srNo: number | null;
  className: string;
  isActive: boolean;
}

export interface ImportClassResult {
  importedCount: number;
  skippedCount: number;
}

export interface DocumentMasterItem {
  documentID: number;
  underOrgID: number;
  srNo: number;
  documentName: string;
  documentTypeID: number | null;
  documentTypeName?: string | null;
  isActive: boolean;
  organizationName?: string | null;
}

export interface DocumentTypeOption {
  documentTypeID: number;
  documentTypeName: string;
}

export interface DocumentFormState {
  documentID: number | null;
  underOrgID: number | null;
  srNo: number | null;
  documentName: string;
  documentTypeID: number | null;
  isActive: boolean;
}

export interface CategoryMasterItem {
  categoryID: number;
  underOrgID: number;
  categoryName: string;
  isActive: boolean;
  organizationName?: string | null;
}

export interface CategoryFormState {
  categoryID: number | null;
  underOrgID: number | null;
  categoryName: string;
  isActive: boolean;
}

export interface DesignationMasterItem {
  designationID: number;
  underOrgID: number;
  srNo: number;
  designationName: string;
  designationNameShort?: string | null;
  leaveYear?: number | null;
  hmOrPrincipal: boolean;
  isActive: boolean;
  organizationName?: string | null;
}

export interface DesignationOption {
  designationID: number;
  underOrgID?: number | null;
  srNo?: number | null;
  designationName: string;
  designationNameShort?: string | null;
  leaveYear?: number | null;
  hmOrPrincipal: boolean;
  isActive: boolean;
}

export interface DesignationFormState {
  designationID: number | null;
  underOrgID: number | null;
  srNo: number | null;
  designationName: string;
  designationNameShort: string;
  leaveYear: number | null;
  hmOrPrincipal: boolean;
  isActive: boolean;
}

export interface SubjectMasterItem {
  subjectID: number;
  underOrgID: number;
  subjectName: string;
  isActive: boolean;
  organizationName?: string | null;
}

export interface SubjectFormState {
  subjectID: number | null;
  underOrgID: number | null;
  subjectName: string;
  isActive: boolean;
}

export interface MasterOption {
  id: number;
  name: string;
}

export interface WeekOption {
  weekID: number;
  weekName: string;
}

export interface AyOption {
  ayID: number;
  ayName: string;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface AcademicScheduleLookups {
  /** School orgs — same as Teacher Master (filtered via auth.filterSchoolOrgs). */
  orgs: OrgOption[];
  classes: MasterOption[];
  subjects: MasterOption[];
  weeks: WeekOption[];
  ayList: AyOption[];
}

export interface AcademicScheduleItem {
  asid: number;
  underOrgID: number;
  tMonth: number;
  classID: number;
  subjectID: number;
  srNo: number;
  title: string;
  description?: string | null;
  weekID: number;
  fileAttachment?: string | null;
  ayID: number;
  organizationName?: string | null;
  className?: string | null;
  subjectName?: string | null;
  weekName?: string | null;
  ayName?: string | null;
}

export interface AcademicScheduleFormState {
  asid: number | null;
  underOrgID: number | null;
  tMonth: number | null;
  classID: number | null;
  subjectID: number | null;
  srNo: number | null;
  title: string;
  description: string;
  weekID: number | null;
  fileAttachment: string;
  ayID: number | null;
}

export interface AcademicScheduleFilter {
  underOrgId?: number | null;
  classId?: number | null;
  subjectId?: number | null;
  tMonth?: number | null;
  weekId?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  ayId?: number | null;
  search?: string | null;
}

export interface ItemGroupMasterItem {
  itemGroupID: number;
  orgID: number;
  srNo: number;
  itemGroupName: string;
  isActive: boolean;
  organizationName?: string | null;
}

export interface ItemGroupFormState {
  itemGroupID: number | null;
  orgID: number | null;
  itemGroupName: string;
  isActive: boolean;
}

export interface ItemMasterItem {
  itemID: number;
  orgID: number;
  itemGroupID: number;
  itemName: string;
  rate: number;
  isActive: boolean;
  organizationName?: string | null;
  itemGroupName?: string | null;
}

export interface ItemFormState {
  itemID: number | null;
  orgID: number | null;
  itemGroupID: number | null;
  itemName: string;
  rate: number | null;
  isActive: boolean;
}

export interface ItemGroupOption {
  itemGroupID: number;
  itemGroupName: string;
  srNo: number;
}

export interface ItemOption {
  itemID: number;
  itemName: string;
  rate: number;
  itemGroupID: number;
}

export interface StockRegisterItem {
  stockID: number;
  orgID: number;
  itemID: number;
  qty: number;
  rate: number;
  amount: number;
  remark?: string | null;
  organizationName?: string | null;
  itemName?: string | null;
}

export interface StockFormState {
  stockID: number | null;
  orgID: number | null;
  itemID: number | null;
  qty: number | null;
  rate: number | null;
  amount: number | null;
  remark: string;
}

export interface InventoryLookups {
  orgs: OrgOption[];
}

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

export function monthLabel(value: number | null | undefined): string {
  return MONTH_OPTIONS.find((m) => m.value === value)?.label ?? '—';
}
