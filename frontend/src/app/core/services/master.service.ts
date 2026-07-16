import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AcademicScheduleFilter,
  AcademicScheduleFormState,
  AcademicScheduleItem,
  AcademicScheduleLookups,
  ApiResponse,
  ClassFormState,
  ClassMasterItem,
  InventoryLookups,
  ItemFormState,
  ItemGroupFormState,
  ItemGroupMasterItem,
  ItemMasterItem,
  StockFormState,
  StockRegisterItem,
  SubjectFormState,
  SubjectMasterItem,
  WeekOption,
  AyOption
} from '../models/master.model';
import { OrgOption } from '../models/audit.model';
import { apiData, apiMessage, apiSuccess } from '../utils/api-response.util';
import { trimText } from '../utils/master-validation.util';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MasterService {
  private readonly base = `${environment.apiBaseUrl}/master`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getClasses(search?: string | null): Observable<ClassMasterItem[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<ClassMasterItem[]>>(`${this.base}/class`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeClass(x)) : [])),
      catchError(() => of([]))
    );
  }

  saveClass(form: ClassFormState): Observable<{ data: ClassMasterItem | null; message?: string }> {
    const payload = {
      classID: form.classID ?? 0,
      className: trimText(form.className),
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<ClassMasterItem>>(`${this.base}/class`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeClass(apiData(r)) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to save class.' }))
    );
  }

  deleteClass(classId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/class/${classId}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message ?? undefined })),
      catchError(() => of({ success: false, message: 'Unable to delete class.' }))
    );
  }

  getSubjects(search?: string | null): Observable<SubjectMasterItem[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<SubjectMasterItem[]>>(`${this.base}/subject`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeSubject(x)) : [])),
      catchError(() => of([]))
    );
  }

  saveSubject(form: SubjectFormState): Observable<{ data: SubjectMasterItem | null; message?: string }> {
    const payload = {
      subjectID: form.subjectID ?? 0,
      subjectName: trimText(form.subjectName),
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<SubjectMasterItem>>(`${this.base}/subject`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeSubject(apiData(r)) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to save subject.' }))
    );
  }

  deleteSubject(subjectId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/subject/${subjectId}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message ?? undefined })),
      catchError(() => of({ success: false, message: 'Unable to delete subject.' }))
    );
  }

  getAcademicScheduleLookups(): Observable<AcademicScheduleLookups | null> {
    return this.http.get<ApiResponse<AcademicScheduleLookups>>(`${this.base}/academic-schedule/lookups`).pipe(
      map((r) => (r.success && r.data ? this.normalizeAcademicLookups(r.data) : null)),
      catchError(() => of(null))
    );
  }

  getCurrentAyId(): Observable<number> {
    return this.http.get<ApiResponse<{ ayID: number }>>(`${this.base}/academic-schedule/current-ay`).pipe(
      map((r) => r.data?.ayID ?? (r.data as { AyID?: number })?.AyID ?? 0),
      catchError(() => of(0))
    );
  }

  getAcademicSchedules(filter: AcademicScheduleFilter): Observable<AcademicScheduleItem[]> {
    let params = new HttpParams();
    if (filter.underOrgId) params = params.set('underOrgId', filter.underOrgId);
    if (filter.classId) params = params.set('classId', filter.classId);
    if (filter.subjectId) params = params.set('subjectId', filter.subjectId);
    if (filter.tMonth) params = params.set('tMonth', filter.tMonth);
    if (filter.weekId) params = params.set('weekId', filter.weekId);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    if (filter.ayId) params = params.set('ayId', filter.ayId);
    if (filter.search?.trim()) params = params.set('search', filter.search.trim());
    return this.http.get<ApiResponse<AcademicScheduleItem[]>>(`${this.base}/academic-schedule`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeSchedule(x)) : [])),
      catchError(() => of([]))
    );
  }

  getAcademicScheduleById(id: number): Observable<AcademicScheduleFormState | null> {
    return this.http.get<ApiResponse<AcademicScheduleItem>>(`${this.base}/academic-schedule/${id}`).pipe(
      map((r) => {
        if (!r.success || !r.data) return null;
        const item = this.normalizeSchedule(r.data);
        return {
          asid: item.asid,
          underOrgID: item.underOrgID,
          tMonth: item.tMonth,
          classID: item.classID,
          subjectID: item.subjectID,
          srNo: item.srNo ?? null,
          title: item.title,
          description: item.description ?? '',
          weekID: item.weekID,
          fileAttachment: item.fileAttachment ?? '',
          ayID: item.ayID
        };
      }),
      catchError(() => of(null))
    );
  }

  saveAcademicSchedule(form: AcademicScheduleFormState): Observable<{ data: AcademicScheduleItem | null; message?: string }> {
    const payload = {
      asid: form.asid ?? 0,
      underOrgID: form.underOrgID ?? 0,
      tMonth: form.tMonth ?? 0,
      classID: form.classID ?? 0,
      subjectID: form.subjectID ?? 0,
      srNo: form.srNo ?? 0,
      tDate: new Date().toISOString().slice(0, 10),
      title: trimText(form.title),
      description: trimText(form.description) || null,
      weekID: form.weekID ?? 0,
      fileAttachment: form.fileAttachment || null,
      ayID: form.ayID ?? 0
    };
    return this.http.post<ApiResponse<AcademicScheduleItem>>(`${this.base}/academic-schedule`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeSchedule(apiData(r)) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to save academic schedule.' }))
    );
  }

  deleteAcademicSchedule(asid: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/academic-schedule/${asid}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message ?? undefined })),
      catchError(() => of({ success: false, message: 'Unable to delete academic schedule.' }))
    );
  }

  uploadAcademicScheduleFile(file: File): Observable<{ fileName: string | null; message?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<string>>(`${this.base}/academic-schedule/upload`, formData).pipe(
      map((r) => ({ fileName: r.success && r.data ? r.data : null, message: r.message ?? undefined })),
      catchError(() => of({ fileName: null, message: 'Unable to upload file.' }))
    );
  }

  academicScheduleFileUrl(fileName: string): string {
    return `${this.base}/academic-schedule/file/${encodeURIComponent(fileName)}`;
  }

  downloadFile(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  getInventoryLookups(): Observable<InventoryLookups | null> {
    return this.http.get<ApiResponse<InventoryLookups>>(`${this.base}/inventory/lookups`).pipe(
      map((r) => (r.success && r.data ? { orgs: (r.data.orgs ?? []).map((o) => this.normalizeOrg(o)) } : null)),
      catchError(() => of(null))
    );
  }

  getItemGroups(orgId: number, search?: string | null): Observable<ItemGroupMasterItem[]> {
    let params = new HttpParams().set('orgId', orgId);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<ItemGroupMasterItem[]>>(`${this.base}/item-group`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeItemGroup(x)) : [])),
      catchError(() => of([]))
    );
  }

  saveItemGroup(form: ItemGroupFormState): Observable<{ data: ItemGroupMasterItem | null; message?: string }> {
    const payload = {
      itemGroupID: form.itemGroupID ?? 0,
      orgID: form.orgID ?? 0,
      itemGroupName: trimText(form.itemGroupName),
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<ItemGroupMasterItem>>(`${this.base}/item-group`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeItemGroup(apiData(r)) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to save item group.' }))
    );
  }

  deleteItemGroup(itemGroupId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/item-group/${itemGroupId}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message ?? undefined })),
      catchError(() => of({ success: false, message: 'Unable to delete item group.' }))
    );
  }

  getItems(orgId: number, search?: string | null): Observable<ItemMasterItem[]> {
    let params = new HttpParams().set('orgId', orgId);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<ItemMasterItem[]>>(`${this.base}/item`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeItem(x)) : [])),
      catchError(() => of([]))
    );
  }

  saveItem(form: ItemFormState): Observable<{ data: ItemMasterItem | null; message?: string }> {
    const payload = {
      itemID: form.itemID ?? 0,
      orgID: form.orgID ?? 0,
      itemGroupID: form.itemGroupID ?? 0,
      itemName: trimText(form.itemName),
      rate: form.rate ?? 0,
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<ItemMasterItem>>(`${this.base}/item`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeItem(apiData(r)) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to save item.' }))
    );
  }

  deleteItem(itemId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/item/${itemId}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message ?? undefined })),
      catchError(() => of({ success: false, message: 'Unable to delete item.' }))
    );
  }

  getStockList(orgId: number, search?: string | null): Observable<StockRegisterItem[]> {
    let params = new HttpParams().set('orgId', orgId);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<StockRegisterItem[]>>(`${this.base}/stock`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeStock(x)) : [])),
      catchError(() => of([]))
    );
  }

  saveStock(form: StockFormState): Observable<{ data: StockRegisterItem | null; message?: string }> {
    const payload = {
      stockID: form.stockID ?? 0,
      orgID: form.orgID ?? 0,
      itemID: form.itemID ?? 0,
      qty: form.qty ?? 0,
      rate: form.rate ?? 0,
      remark: trimText(form.remark) || null
    };
    return this.http.post<ApiResponse<StockRegisterItem>>(`${this.base}/stock`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeStock(apiData(r)) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to save stock entry.' }))
    );
  }

  deleteStock(stockId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/stock/${stockId}`).pipe(
      map((r) => ({ success: !!r.success, message: r.message ?? undefined })),
      catchError(() => of({ success: false, message: 'Unable to delete stock entry.' }))
    );
  }

  private normalizeClass(raw: unknown): ClassMasterItem {
    const r = raw as ClassMasterItem & { ClassID?: number; ClassName?: string; IsActive?: boolean };
    return {
      classID: Number(r.classID ?? r.ClassID ?? 0),
      className: String(r.className ?? r.ClassName ?? ''),
      isActive: Boolean(r.isActive ?? r.IsActive ?? true)
    };
  }

  private normalizeSubject(raw: unknown): SubjectMasterItem {
    const r = raw as SubjectMasterItem & { SubjectID?: number; SubjectName?: string; IsActive?: boolean };
    return {
      subjectID: Number(r.subjectID ?? r.SubjectID ?? 0),
      subjectName: String(r.subjectName ?? r.SubjectName ?? ''),
      isActive: Boolean(r.isActive ?? r.IsActive ?? true)
    };
  }

  private normalizeAcademicLookups(raw: unknown): AcademicScheduleLookups {
    const data = raw as Record<string, unknown>;
    // Prefer orgs (Teacher Master); fall back to legacy sansthaOrgs key until API is updated
    const rawOrgs =
      ((data['orgs'] ?? data['Orgs'] ?? data['sansthaOrgs'] ?? data['SansthaOrgs']) as OrgOption[] | undefined) ?? [];
    return {
      orgs: this.auth.filterSchoolOrgs(rawOrgs.map((o) => this.normalizeOrg(o))),
      classes: ((data['classes'] ?? data['Classes']) as { id?: number; Id?: number; name?: string; Name?: string }[] | undefined)?.map((c) => ({
        id: Number(c.id ?? c.Id ?? 0),
        name: String(c.name ?? c.Name ?? '')
      })) ?? [],
      subjects: ((data['subjects'] ?? data['Subjects']) as { id?: number; Id?: number; name?: string; Name?: string }[] | undefined)?.map((s) => ({
        id: Number(s.id ?? s.Id ?? 0),
        name: String(s.name ?? s.Name ?? '')
      })) ?? [],
      weeks: ((data['weeks'] ?? data['Weeks']) as unknown[] | undefined)?.map((w) => this.normalizeWeek(w)) ?? [],
      ayList: ((data['ayList'] ?? data['AyList']) as unknown[] | undefined)?.map((a) => this.normalizeAy(a)) ?? []
    };
  }

  private normalizeSchedule(raw: unknown): AcademicScheduleItem {
    const r = raw as AcademicScheduleItem & Record<string, unknown>;
    return {
      asid: Number(r.asid ?? r['ASID'] ?? 0),
      underOrgID: Number(r.underOrgID ?? r['UnderOrgID'] ?? 0),
      tMonth: Number(r.tMonth ?? r['TMonth'] ?? 0),
      classID: Number(r.classID ?? r['ClassID'] ?? 0),
      subjectID: Number(r.subjectID ?? r['SubjectID'] ?? 0),
      srNo: Number(r.srNo ?? r['SrNo'] ?? 0),
      title: String(r.title ?? r['Title'] ?? ''),
      description: (r.description ?? r['Description']) as string | null | undefined,
      weekID: Number(r.weekID ?? r['WeekID'] ?? 0),
      fileAttachment: (r.fileAttachment ?? r['FileAttachment']) as string | null | undefined,
      ayID: Number(r.ayID ?? r['AyID'] ?? 0),
      organizationName: (r.organizationName ?? r['OrganizationName']) as string | null | undefined,
      className: (r.className ?? r['ClassName']) as string | null | undefined,
      subjectName: (r.subjectName ?? r['SubjectName']) as string | null | undefined,
      weekName: (r.weekName ?? r['WeekName']) as string | null | undefined,
      ayName: (r.ayName ?? r['AyName']) as string | null | undefined
    };
  }

  private normalizeItemGroup(raw: unknown): ItemGroupMasterItem {
    const r = raw as ItemGroupMasterItem & Record<string, unknown>;
    return {
      itemGroupID: Number(r.itemGroupID ?? r['ItemGroupID'] ?? 0),
      orgID: Number(r.orgID ?? r['OrgID'] ?? 0),
      srNo: Number(r.srNo ?? r['SrNo'] ?? 0),
      itemGroupName: String(r.itemGroupName ?? r['ItemGroupName'] ?? ''),
      isActive: Boolean(r.isActive ?? r['IsActive'] ?? true),
      organizationName: (r.organizationName ?? r['OrganizationName']) as string | null | undefined
    };
  }

  private normalizeItem(raw: unknown): ItemMasterItem {
    const r = raw as ItemMasterItem & Record<string, unknown>;
    return {
      itemID: Number(r.itemID ?? r['ItemID'] ?? 0),
      orgID: Number(r.orgID ?? r['OrgID'] ?? 0),
      itemGroupID: Number(r.itemGroupID ?? r['ItemGroupID'] ?? 0),
      itemName: String(r.itemName ?? r['ItemName'] ?? ''),
      rate: Number(r.rate ?? r['Rate'] ?? 0),
      isActive: Boolean(r.isActive ?? r['IsActive'] ?? true),
      organizationName: (r.organizationName ?? r['OrganizationName']) as string | null | undefined,
      itemGroupName: (r.itemGroupName ?? r['ItemGroupName']) as string | null | undefined
    };
  }

  private normalizeStock(raw: unknown): StockRegisterItem {
    const r = raw as StockRegisterItem & Record<string, unknown>;
    return {
      stockID: Number(r.stockID ?? r['StockID'] ?? 0),
      orgID: Number(r.orgID ?? r['OrgID'] ?? 0),
      itemID: Number(r.itemID ?? r['ItemID'] ?? 0),
      qty: Number(r.qty ?? r['Qty'] ?? 0),
      rate: Number(r.rate ?? r['Rate'] ?? 0),
      amount: Number(r.amount ?? r['Amount'] ?? 0),
      remark: (r.remark ?? r['Remark']) as string | null | undefined,
      organizationName: (r.organizationName ?? r['OrganizationName']) as string | null | undefined,
      itemName: (r.itemName ?? r['ItemName']) as string | null | undefined
    };
  }

  private normalizeOrg(raw: unknown): OrgOption {
    const r = raw as OrgOption & Record<string, unknown>;
    return {
      orgID: Number(r.orgID ?? r['OrgID'] ?? 0),
      organizationName: String(r.organizationName ?? r['OrganizationName'] ?? ''),
      schoolCode: Number(r.schoolCode ?? r['SchoolCode'] ?? 0),
      shortName: (r.shortName ?? r['ShortName']) as string | undefined
    };
  }

  private normalizeWeek(raw: unknown): WeekOption {
    const r = raw as WeekOption & Record<string, unknown>;
    return {
      weekID: Number(r.weekID ?? r['WeekID'] ?? 0),
      weekName: String(r.weekName ?? r['WeekName'] ?? '')
    };
  }

  private normalizeAy(raw: unknown): AyOption {
    const r = raw as AyOption & Record<string, unknown>;
    return {
      ayID: Number(r.ayID ?? r['AyID'] ?? 0),
      ayName: String(r.ayName ?? r['AyName'] ?? ''),
      fromDate: (r.fromDate ?? r['FromDate']) as string | null | undefined,
      toDate: (r.toDate ?? r['ToDate']) as string | null | undefined
    };
  }
}

