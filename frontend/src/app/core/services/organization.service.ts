import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  OrganizationDocumentOption,
  OrganizationFormState,
  OrganizationListFilter,
  OrganizationListItem,
  OrganizationLookups,
  SansthaOrgOption
} from '../models/organization.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly base = `${environment.apiBaseUrl}/organization`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getLookups(): Observable<OrganizationLookups | null> {
    return this.http.get<ApiResponse<OrganizationLookups>>(`${this.base}/lookups`).pipe(
      map((r) => (r.success && r.data ? this.normalizeLookups(r.data as unknown as Record<string, unknown>) : null)),
      catchError(() => of(null))
    );
  }

  getDocumentsByBusinessCategory(businessCategoryId: number): Observable<OrganizationDocumentOption[]> {
    const params = new HttpParams().set('businessCategoryId', businessCategoryId.toString());
    return this.http.get<ApiResponse<OrganizationDocumentOption[]>>(`${this.base}/documents`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((d) => this.normalizeDocumentOption(d as unknown as Record<string, unknown>)) : [])),
      catchError(() => of([]))
    );
  }

  getNextSrNo(underOrgId: number): Observable<number | null> {
    const params = new HttpParams().set('underOrgId', underOrgId.toString());
    return this.http.get<ApiResponse<{ nextSrNo: number }>>(`${this.base}/next-srno`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.nextSrNo ?? null : null)),
      catchError(() => of(null))
    );
  }

  getList(filter: OrganizationListFilter): Observable<OrganizationListItem[]> {
    let params = new HttpParams();
    if (filter.search?.trim()) params = params.set('search', filter.search.trim());
    if (filter.businessCategoryID) params = params.set('businessCategoryID', filter.businessCategoryID.toString());
    if (filter.schoolCategoryID) params = params.set('schoolCategoryID', filter.schoolCategoryID.toString());
    // API param underOrgID = selected Org / School scope (OrgID or children under it)
    if (filter.orgId) params = params.set('underOrgID', filter.orgId.toString());
    if (filter.cityName?.trim()) params = params.set('cityName', filter.cityName.trim());
    if (filter.isActive !== null && filter.isActive !== undefined) {
      params = params.set('isActive', filter.isActive.toString());
    }

    return this.http.get<ApiResponse<OrganizationListItem[]>>(this.base, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((item) => this.normalizeListItem(item as unknown as Record<string, unknown>)) : [])),
      catchError(() => of([]))
    );
  }

  getById(orgId: number): Observable<OrganizationFormState | null> {
    return this.http.get<ApiResponse<Record<string, unknown>>>(`${this.base}/${orgId}`).pipe(
      map((r) => (r.success && r.data ? this.mapToForm(r.data) : null)),
      catchError(() => of(null))
    );
  }

  save(form: OrganizationFormState): Observable<{ data: OrganizationFormState | null; message?: string }> {
    const payload = {
      orgID: form.orgID ?? 0,
      businessCategoryID: form.businessCategoryID,
      underOrgID: form.underOrgID,
      schoolCategoryID: form.schoolCategoryID,
      organizationName: form.organizationName,
      address: form.address || null,
      cityName: form.cityName || null,
      udiesNo: form.udiesNo || null,
      schoolTinNo: form.schoolTinNo || null,
      sharlarthID: form.sharlarthID || null,
      panNo: form.panNo || null,
      emailID: form.emailID || null,
      phoneNo: form.phoneNo || null,
      mobileNo: form.mobileNo || null,
      webSite: form.webSite || null,
      establishmentYear: form.establishmentYear || null,
      regNo: form.regNo || null,
      permission80G: form.permission80G || null,
      remark: form.remark || null,
      isActive: form.isActive,
      documents: form.documents
        .filter((d) => d.documentID && d.documentPath)
        .map((d) => ({ documentID: d.documentID, documentPath: d.documentPath }))
    };

    return this.http.post<ApiResponse<Record<string, unknown>>>(this.base, payload).pipe(
      map((r) => ({
        data: r.success && r.data ? this.mapToForm(r.data) : null,
        message: r.message
      })),
      catchError((err) => of({ data: null, message: err?.error?.message ?? 'Unable to save organization.' }))
    );
  }

  delete(orgId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/${orgId}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message })),
      catchError(() => of({ success: false, message: 'Unable to deactivate organization.' }))
    );
  }

  uploadDocument(file: File, orgId: number | null, documentId: number | null): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    let params = new HttpParams();
    if (orgId) params = params.set('orgId', orgId.toString());
    if (documentId) params = params.set('documentId', documentId.toString());

    return this.http.post<ApiResponse<string>>(`${this.base}/upload`, formData, { params }).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  fileUrl(fileName: string): string {
    return `${this.base}/file/${encodeURIComponent(fileName)}`;
  }

  downloadFile(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  private normalizeLookups(raw: Record<string, unknown>): OrganizationLookups {
    const businessCategories = (raw['businessCategories'] ?? raw['BusinessCategories'] ?? []) as Array<Record<string, unknown>>;
    const schoolCategories = (raw['schoolCategories'] ?? raw['SchoolCategories'] ?? []) as Array<Record<string, unknown>>;
    // Prefer orgs (Teacher Master); fall back to legacy sansthaOrgs until API is updated
    const rawOrgs =
      ((raw['orgs'] ?? raw['Orgs'] ?? raw['sansthaOrgs'] ?? raw['SansthaOrgs']) as Array<Record<string, unknown>>) ?? [];
    const mapped = rawOrgs.map((x) => this.normalizeOrg(x));
    return {
      businessCategories: businessCategories.map((x) => ({
        id: Number(x['id'] ?? x['Id'] ?? 0),
        name: String(x['name'] ?? x['Name'] ?? '')
      })),
      schoolCategories: schoolCategories.map((x) => ({
        id: Number(x['id'] ?? x['Id'] ?? 0),
        name: String(x['name'] ?? x['Name'] ?? '')
      })),
      orgs: this.auth.filterSchoolOrgs(mapped)
    };
  }

  private normalizeOrg(raw: Record<string, unknown>): SansthaOrgOption {
    return {
      orgID: Number(raw['orgID'] ?? raw['OrgID'] ?? 0),
      organizationName: String(raw['organizationName'] ?? raw['OrganizationName'] ?? ''),
      businessCategoryID: (raw['businessCategoryID'] ?? raw['BusinessCategoryID'] ?? null) as number | null,
      underOrgID: (raw['underOrgID'] ?? raw['UnderOrgID'] ?? null) as number | null
    };
  }

  private normalizeDocumentOption(raw: Record<string, unknown>): OrganizationDocumentOption {
    return {
      documentID: Number(raw['documentID'] ?? raw['DocumentID'] ?? 0),
      documentName: String(raw['documentName'] ?? raw['DocumentName'] ?? ''),
      documentTypeID: (raw['documentTypeID'] ?? raw['DocumentTypeID'] ?? null) as number | null
    };
  }

  private normalizeListItem(raw: Record<string, unknown>): OrganizationListItem {
    return {
      orgID: Number(raw['orgID'] ?? raw['OrgID'] ?? 0),
      businessCategoryID: (raw['businessCategoryID'] ?? raw['BusinessCategoryID'] ?? null) as number | null,
      businessCategoryName: (raw['businessCategoryName'] ?? raw['BusinessCategoryName'] ?? null) as string | null,
      underOrgID: (raw['underOrgID'] ?? raw['UnderOrgID'] ?? null) as number | null,
      underOrgName: (raw['underOrgName'] ?? raw['UnderOrgName'] ?? null) as string | null,
      srNo: (raw['srNo'] ?? raw['SrNo'] ?? null) as number | null,
      schoolCategoryID: (raw['schoolCategoryID'] ?? raw['SchoolCategoryID'] ?? null) as number | null,
      schoolCategoryName: (raw['schoolCategoryName'] ?? raw['SchoolCategoryName'] ?? null) as string | null,
      organizationName: String(raw['organizationName'] ?? raw['OrganizationName'] ?? ''),
      address: (raw['address'] ?? raw['Address'] ?? null) as string | null,
      cityName: (raw['cityName'] ?? raw['CityName'] ?? null) as string | null,
      udiesNo: (raw['udiesNo'] ?? raw['UDiesNo'] ?? null) as string | null,
      schoolTinNo: (raw['schoolTinNo'] ?? raw['SchoolTinNo'] ?? null) as string | null,
      sharlarthID: (raw['sharlarthID'] ?? raw['SharlarthID'] ?? null) as string | null,
      panNo: (raw['panNo'] ?? raw['PanNo'] ?? null) as string | null,
      emailID: (raw['emailID'] ?? raw['EmailID'] ?? null) as string | null,
      phoneNo: (raw['phoneNo'] ?? raw['PhoneNo'] ?? null) as string | null,
      mobileNo: (raw['mobileNo'] ?? raw['MobileNo'] ?? null) as string | null,
      webSite: (raw['webSite'] ?? raw['WebSite'] ?? null) as string | null,
      establishmentYear: (raw['establishmentYear'] ?? raw['EstablishmentYear'] ?? null) as string | null,
      regNo: (raw['regNo'] ?? raw['RegNo'] ?? null) as string | null,
      permission80G: (raw['permission80G'] ?? raw['Permission80G'] ?? null) as string | null,
      remark: (raw['remark'] ?? raw['Remark'] ?? null) as string | null,
      isActive: Boolean(raw['isActive'] ?? raw['IsActive'] ?? true)
    };
  }

  private mapToForm(raw: Record<string, unknown>): OrganizationFormState {
    const docs = (raw['documents'] ?? raw['Documents'] ?? []) as Array<Record<string, unknown>>;
    return {
      orgID: (raw['orgID'] ?? raw['OrgID'] ?? null) as number | null,
      businessCategoryID: (raw['businessCategoryID'] ?? raw['BusinessCategoryID'] ?? null) as number | null,
      underOrgID: (raw['underOrgID'] ?? raw['UnderOrgID'] ?? null) as number | null,
      srNo: (raw['srNo'] ?? raw['SrNo'] ?? null) as number | null,
      schoolCategoryID: (raw['schoolCategoryID'] ?? raw['SchoolCategoryID'] ?? null) as number | null,
      organizationName: String(raw['organizationName'] ?? raw['OrganizationName'] ?? ''),
      address: String(raw['address'] ?? raw['Address'] ?? ''),
      cityName: String(raw['cityName'] ?? raw['CityName'] ?? ''),
      udiesNo: String(raw['udiesNo'] ?? raw['UDiesNo'] ?? ''),
      schoolTinNo: String(raw['schoolTinNo'] ?? raw['SchoolTinNo'] ?? ''),
      sharlarthID: String(raw['sharlarthID'] ?? raw['SharlarthID'] ?? ''),
      panNo: String(raw['panNo'] ?? raw['PanNo'] ?? ''),
      emailID: String(raw['emailID'] ?? raw['EmailID'] ?? ''),
      phoneNo: String(raw['phoneNo'] ?? raw['PhoneNo'] ?? ''),
      mobileNo: String(raw['mobileNo'] ?? raw['MobileNo'] ?? ''),
      webSite: String(raw['webSite'] ?? raw['WebSite'] ?? ''),
      establishmentYear: String(raw['establishmentYear'] ?? raw['EstablishmentYear'] ?? ''),
      regNo: String(raw['regNo'] ?? raw['RegNo'] ?? ''),
      permission80G: String(raw['permission80G'] ?? raw['Permission80G'] ?? ''),
      remark: String(raw['remark'] ?? raw['Remark'] ?? ''),
      isActive: Boolean(raw['isActive'] ?? raw['IsActive'] ?? true),
      documents: docs.length
        ? docs.map((d) => ({
            rowId: `doc-${d['documentID'] ?? d['DocumentID'] ?? Math.random().toString(36).slice(2)}`,
            documentID: (d['documentID'] ?? d['DocumentID'] ?? null) as number | null,
            documentPath: (d['documentPath'] ?? d['DocumentPath'] ?? null) as string | null,
            selectedFileName: null,
            pendingFile: null
          }))
        : [
            {
              rowId: `doc-${Date.now()}`,
              documentID: null,
              documentPath: null,
              selectedFileName: null,
              pendingFile: null
            }
          ]
    };
  }
}
