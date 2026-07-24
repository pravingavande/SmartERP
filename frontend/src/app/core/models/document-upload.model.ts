export interface DocumentUploadItem {
  documentUploadID: number;
  orgID: number;
  underOrgID?: number | null;
  srNo: number;
  tDate: string;
  documentTitle: string;
  documentPath?: string | null;
  organizationName?: string | null;
}

export interface DocumentUploadFormState {
  documentUploadID: number | null;
  orgID: number | null;
  srNo: number | null;
  tDate: string;
  documentTitle: string;
  documentPath: string;
}
