export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface IdNameOption {
  id: number;
  name: string;
}

export interface LongIdNameOption {
  id: number;
  name: string;
}

export interface SansthaOrgOption {
  orgID: number;
  organizationName: string;
  businessCategoryID?: number | null;
  underOrgID?: number | null;
}

export interface OrganizationDocumentOption {
  documentID: number;
  documentName: string;
  documentTypeID?: number | null;
}

export interface OrganizationLookups {
  businessCategories: IdNameOption[];
  schoolCategories: LongIdNameOption[];
  /** School orgs — same as Teacher Master (filtered via auth.filterSchoolOrgs). */
  orgs: SansthaOrgOption[];
  /** Sanstha orgs for list filter (UnderOrgID scope). */
  sansthaOrgs: SansthaOrgOption[];
}

export interface OrganizationListFilter {
  search: string;
  businessCategoryID: number | null;
  schoolCategoryID: number | null;
  /** Selected Org / School (same meaning as Teacher Master list orgId). */
  orgId: number | null;
  cityName: string;
  isActive: boolean | null;
}

export interface OrganizationListItem {
  orgID: number;
  businessCategoryID?: number | null;
  businessCategoryName?: string | null;
  underOrgID?: number | null;
  underOrgName?: string | null;
  srNo?: number | null;
  schoolCategoryID?: number | null;
  schoolCategoryName?: string | null;
  organizationName: string;
  address?: string | null;
  cityName?: string | null;
  udiesNo?: string | null;
  schoolTinNo?: string | null;
  sharlarthID?: string | null;
  panNo?: string | null;
  emailID?: string | null;
  phoneNo?: string | null;
  mobileNo?: string | null;
  webSite?: string | null;
  establishmentYear?: string | null;
  regNo?: string | null;
  permission80G?: string | null;
  remark?: string | null;
  isActive: boolean;
}

export interface OrganizationDocumentLine {
  rowId: string;
  documentID: number | null;
  documentPath: string | null;
  selectedFileName?: string | null;
  pendingFile?: File | null;
}

export interface OrganizationFormState {
  orgID: number | null;
  businessCategoryID: number | null;
  underOrgID: number | null;
  srNo: number | null;
  schoolCategoryID: number | null;
  organizationName: string;
  address: string;
  cityName: string;
  udiesNo: string;
  schoolTinNo: string;
  sharlarthID: string;
  panNo: string;
  emailID: string;
  phoneNo: string;
  mobileNo: string;
  webSite: string;
  establishmentYear: string;
  regNo: string;
  permission80G: string;
  remark: string;
  isActive: boolean;
  documents: OrganizationDocumentLine[];
}

export const SCHOOL_BUSINESS_CATEGORY_ID = 2;
export const SANSTHA_BUSINESS_CATEGORY_ID = 3;
