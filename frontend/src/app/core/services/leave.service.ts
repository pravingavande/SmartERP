import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { OrgOption } from '../models/audit.model';
import {
  ApiResponse,
  AyOption,
  EmployeeOption,
  LeaveApplyFormState,
  LeaveApplyListItem,
  LeaveApplyLookupsBundle,
  LeaveOption,
  LeaveTypeFormState,
  LeaveTypeItem
} from '../models/leave.model';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly base = `${environment.apiBaseUrl}/leave`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getLeaveTypes(): Observable<LeaveTypeItem[]> {
    return this.http.get<ApiResponse<LeaveTypeItem[]>>(`${this.base}/types`).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeLeaveType(x)) : [])),
      catchError(() => of([]))
    );
  }

  saveLeaveType(form: LeaveTypeFormState): Observable<LeaveTypeItem | null> {
    const payload = {
      leaveTypeID: form.leaveTypeID ?? 0,
      leaveTypeName: form.leaveTypeName,
      isActive: form.isActive
    };
    return this.http.post<ApiResponse<LeaveTypeItem>>(`${this.base}/types`, payload).pipe(
      map((r) => (r.success && r.data ? this.normalizeLeaveType(r.data) : null)),
      catchError(() => of(null))
    );
  }

  getLookups(): Observable<LeaveApplyLookupsBundle | null> {
    return this.http.get<ApiResponse<LeaveApplyLookupsBundle>>(`${this.base}/lookups`).pipe(
      map((r) => (r.success && r.data ? this.normalizeLookupsBundle(r.data) : null)),
      catchError(() => of(null))
    );
  }

  getEmployees(orgId: number): Observable<EmployeeOption[]> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<EmployeeOption[]>>(`${this.base}/employees`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeEmployee(x)) : [])),
      catchError(() => of([]))
    );
  }

  getNextRecordNo(orgId: number): Observable<number> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<{ nextRecordNo: number }>>(`${this.base}/next-record-no`, { params }).pipe(
      map((r) => r.data?.nextRecordNo ?? r.data?.['NextRecordNo' as keyof typeof r.data] ?? 1),
      catchError(() => of(1))
    );
  }

  getList(orgId?: number | null, ayId?: number | null): Observable<LeaveApplyListItem[]> {
    let params = new HttpParams();
    if (orgId) params = params.set('orgId', orgId.toString());
    if (ayId) params = params.set('ayId', ayId.toString());
    return this.http.get<ApiResponse<LeaveApplyListItem[]>>(this.base, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((x) => this.normalizeListItem(x)) : [])),
      catchError(() => of([]))
    );
  }

  getById(id: number): Observable<LeaveApplyFormState | null> {
    return this.http.get<ApiResponse<LeaveApplyFormState & { userLeaveApplyID: number }>>(`${this.base}/${id}`).pipe(
      map((r) => (r.success && r.data ? this.mapToForm(r.data) : null)),
      catchError(() => of(null))
    );
  }

  save(form: LeaveApplyFormState): Observable<LeaveApplyFormState | null> {
    const payload = {
      userLeaveApplyID: form.userLeaveApplyID ?? 0,
      orgID: form.orgID,
      recordNo: form.recordNo,
      tDate: form.tDate || null,
      userID: form.userID,
      leaveTypeID: form.leaveTypeID,
      leaveReason: form.leaveReason,
      fromDate: form.fromDate || null,
      toDate: form.toDate || null,
      adminRemak: form.adminRemak,
      leavePermissionID: form.leavePermissionID,
      ayID: form.ayID
    };
    return this.http.post<ApiResponse<LeaveApplyFormState & { userLeaveApplyID: number }>>(this.base, payload).pipe(
      map((r) => (r.success && r.data ? this.mapToForm(r.data) : null)),
      catchError(() => of(null))
    );
  }

  calcNoOfDays(fromDate: string, toDate: string): number | null {
    if (!fromDate || !toDate) return null;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return null;
    const ms = to.getTime() - from.getTime();
    return Math.floor(ms / 86400000) + 1;
  }

  private normalizeLookupsBundle(raw: LeaveApplyLookupsBundle & { Lookups?: LeaveApplyLookupsBundle['lookups']; Orgs?: OrgOption[] }): LeaveApplyLookupsBundle {
    const lk = raw.lookups ?? raw.Lookups;
    const orgs = raw.orgs ?? raw.Orgs ?? [];
    return {
      orgs: this.auth.filterSchoolOrgs(orgs.map((o) => this.normalizeOrg(o))),
      lookups: {
        leaveTypes: this.normalizeOptions(lk?.leaveTypes ?? lk?.['LeaveTypes' as keyof typeof lk]),
        leavePermissions: this.normalizeOptions(lk?.leavePermissions ?? lk?.['LeavePermissions' as keyof typeof lk]),
        ayList: this.normalizeAyList(lk?.ayList ?? lk?.['AyList' as keyof typeof lk])
      }
    };
  }

  private normalizeOrg(raw: OrgOption & { OrgID?: number; OrganizationName?: string; SchoolCode?: number | null }): OrgOption {
    return {
      orgID: raw.orgID ?? raw.OrgID ?? 0,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? '',
      shortName: raw.shortName ?? null,
      schoolCode: raw.schoolCode ?? raw.SchoolCode ?? null
    };
  }

  private normalizeOptions(raw?: LeaveOption[] | null): LeaveOption[] {
    return (raw ?? []).map((x) => ({
      id: x.id ?? (x as LeaveOption & { Id?: number }).Id ?? 0,
      name: x.name ?? (x as LeaveOption & { Name?: string }).Name ?? ''
    }));
  }

  private normalizeAyList(raw?: AyOption[] | null): AyOption[] {
    return (raw ?? []).map((x) => ({
      ayID: x.ayID ?? (x as AyOption & { AyID?: number }).AyID ?? 0,
      ayName: x.ayName ?? (x as AyOption & { AyName?: string }).AyName ?? '',
      fromDate: this.toDateInput(x.fromDate ?? (x as AyOption & { FromDate?: string }).FromDate),
      toDate: this.toDateInput(x.toDate ?? (x as AyOption & { ToDate?: string }).ToDate)
    }));
  }

  private normalizeLeaveType(raw: LeaveTypeItem & { LeaveTypeID?: number; LeaveTypeName?: string; IsActive?: boolean }): LeaveTypeItem {
    return {
      leaveTypeID: raw.leaveTypeID ?? raw.LeaveTypeID ?? 0,
      leaveTypeName: raw.leaveTypeName ?? raw.LeaveTypeName ?? '',
      isActive: raw.isActive ?? raw.IsActive ?? true
    };
  }

  private normalizeEmployee(raw: EmployeeOption & { UserID?: number; DisplayName?: string; MobileNo1?: string }): EmployeeOption {
    return {
      userID: raw.userID ?? raw.UserID ?? 0,
      displayName: raw.displayName ?? raw.DisplayName ?? '',
      mobileNo1: raw.mobileNo1 ?? raw.MobileNo1 ?? ''
    };
  }

  private normalizeListItem(raw: LeaveApplyListItem & {
    UserLeaveApplyID?: number;
    OrgID?: number | null;
    OrganizationName?: string;
    RecordNo?: number | null;
    TDate?: string | null;
    UserID?: number | null;
    Firstname?: string;
    MiddleName?: string;
    LastName?: string;
    LeaveTypeID?: number | null;
    LeaveTypeName?: string;
    LeaveReason?: string;
    FromDate?: string | null;
    ToDate?: string | null;
    NoOfDay?: number | null;
    AdminRemak?: string;
    LeavePermissionID?: number | null;
    LeavePermissionName?: string;
    AyID?: number | null;
    AyName?: string;
    DisplayName?: string;
  }): LeaveApplyListItem {
    const firstname = String(raw.firstname ?? raw.Firstname ?? '');
    const middleName = String(raw.middleName ?? raw.MiddleName ?? '');
    const lastName = String(raw.lastName ?? raw.LastName ?? '');
    return {
      userLeaveApplyID: Number(raw.userLeaveApplyID ?? raw.UserLeaveApplyID ?? 0),
      orgID: raw.orgID ?? raw.OrgID ?? null,
      organizationName: String(raw.organizationName ?? raw.OrganizationName ?? ''),
      recordNo: raw.recordNo ?? raw.RecordNo ?? null,
      tDate: this.toDateInput(raw.tDate ?? raw.TDate),
      userID: raw.userID ?? raw.UserID ?? null,
      firstname,
      middleName,
      lastName,
      leaveTypeID: raw.leaveTypeID ?? raw.LeaveTypeID ?? null,
      leaveTypeName: String(raw.leaveTypeName ?? raw.LeaveTypeName ?? ''),
      leaveReason: String(raw.leaveReason ?? raw.LeaveReason ?? ''),
      fromDate: this.toDateInput(raw.fromDate ?? raw.FromDate),
      toDate: this.toDateInput(raw.toDate ?? raw.ToDate),
      noOfDay: raw.noOfDay ?? raw.NoOfDay ?? null,
      adminRemak: String(raw.adminRemak ?? raw.AdminRemak ?? ''),
      leavePermissionID: raw.leavePermissionID ?? raw.LeavePermissionID ?? null,
      leavePermissionName: String(raw.leavePermissionName ?? raw.LeavePermissionName ?? ''),
      ayID: raw.ayID ?? raw.AyID ?? null,
      ayName: String(raw.ayName ?? raw.AyName ?? ''),
      displayName: String(raw.displayName ?? raw.DisplayName ?? [firstname, middleName, lastName].filter(Boolean).join(' '))
    };
  }

  private mapToForm(raw: LeaveApplyFormState & {
    UserLeaveApplyID?: number | null;
    OrgID?: number | null;
    RecordNo?: number | null;
    TDate?: string | null;
    UserID?: number | null;
    LeaveTypeID?: number | null;
    LeaveReason?: string;
    FromDate?: string | null;
    ToDate?: string | null;
    NoOfDay?: number | null;
    AdminRemak?: string;
    LeavePermissionID?: number | null;
    AyID?: number | null;
  }): LeaveApplyFormState {
    const fromDate = this.toDateInput(raw.fromDate ?? raw.FromDate);
    const toDate = this.toDateInput(raw.toDate ?? raw.ToDate);
    return {
      userLeaveApplyID: raw.userLeaveApplyID ?? raw.UserLeaveApplyID ?? null,
      orgID: raw.orgID ?? raw.OrgID ?? null,
      recordNo: raw.recordNo ?? raw.RecordNo ?? null,
      tDate: this.toDateInput(raw.tDate ?? raw.TDate) || this.today(),
      userID: raw.userID ?? raw.UserID ?? null,
      leaveTypeID: raw.leaveTypeID ?? raw.LeaveTypeID ?? null,
      leaveReason: String(raw.leaveReason ?? raw.LeaveReason ?? ''),
      fromDate,
      toDate,
      noOfDay: raw.noOfDay ?? raw.NoOfDay ?? this.calcNoOfDays(fromDate, toDate),
      adminRemak: String(raw.adminRemak ?? raw.AdminRemak ?? ''),
      leavePermissionID: raw.leavePermissionID ?? raw.LeavePermissionID ?? null,
      ayID: raw.ayID ?? raw.AyID ?? null
    };
  }

  private toDateInput(value: unknown): string {
    if (!value) return '';
    const text = String(value);
    return text.length >= 10 ? text.slice(0, 10) : text;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
