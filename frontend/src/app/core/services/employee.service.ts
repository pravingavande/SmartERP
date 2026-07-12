import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { OrgOption } from '../models/audit.model';
import {
  ApiResponse,
  CodeNameOption,
  EmployeeFormState,
  EmployeeListItem,
  EmployeeLookups,
  EmployeeLookupsBundle,
  UserTypeOption
} from '../models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly base = `${environment.apiBaseUrl}/employee`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getLookups(): Observable<EmployeeLookupsBundle | null> {
    return this.http.get<ApiResponse<EmployeeLookupsBundle>>(`${this.base}/lookups`).pipe(
      map((r) => (r.success && r.data ? this.normalizeLookupsBundle(r.data) : null)),
      catchError(() => of(null))
    );
  }

  getList(orgId?: number | null, search?: string | null): Observable<EmployeeListItem[]> {
    let params = new HttpParams();
    if (orgId) params = params.set('orgId', orgId.toString());
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<EmployeeListItem[]>>(this.base, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((item) => this.normalizeListItem(item)) : [])),
      catchError(() => of([]))
    );
  }

  getById(userId: number): Observable<EmployeeFormState | null> {
    return this.http.get<ApiResponse<EmployeeFormState>>(`${this.base}/${userId}`).pipe(
      map((r) => (r.success && r.data ? this.mapToForm(r.data) : null)),
      catchError(() => of(null))
    );
  }

  save(form: EmployeeFormState): Observable<EmployeeFormState | null> {
    const payload = {
      userID: form.userID ?? 0,
      schoolCode: form.schoolCode,
      orgID: form.orgID,
      userTypeID: form.userTypeID,
      designationCode: form.designationCode,
      firstname: form.firstname,
      middleName: form.middleName,
      lastName: form.lastName,
      permanentAddress: form.permanentAddress,
      localAddress: form.localAddress,
      genderCode: form.genderCode,
      dob: form.dob || null,
      adharCardNo: form.adharCardNo,
      mobileNo1: form.mobileNo1,
      mobileNo2: form.mobileNo2,
      emailID: form.emailID,
      panNo: form.panNo,
      remark: form.remark,
      appUserName: form.appUserName,
      appPassword: form.appPassword,
      isActive: form.isActive,
      education: form.education
        .filter((e) => e.educationCodePassExam || e.univercity?.trim())
        .map((e) => ({
          srNo: e.srNo,
          educationCodePassExam: e.educationCodePassExam,
          univercity: e.univercity,
          passingYear: e.passingYear,
          percentage: e.percentage,
          qualificationTypeCode: e.qualificationTypeCode,
          educationStatusCode: e.educationStatusCode
        })),
      documents: form.documents
        .filter((d) => d.empDocumentCode)
        .map((d) => ({
          empDocumentCode: d.empDocumentCode,
          empDocumentPath: d.empDocumentPath || d.selectedFileName || null
        })),
      schools: form.schools
        .filter((s) => s.orgID)
        .map((s) => ({
          srNo: s.srNo,
          orgID: s.orgID,
          schoolCode: s.schoolCode,
          designationCode: s.designationCode,
          teachClass: s.teachClass,
          teachSubject: s.teachSubject,
          schoolJoiningDate: s.schoolJoiningDate || null,
          schoolLeaveDate: s.schoolLeaveDate || null,
          sansthaTransferOrderNoAndDate: s.sansthaTransferOrderNoAndDate,
          zpTransferOrderNoAndDate: s.zpTransferOrderNoAndDate
        }))
    };

    return this.http.post<ApiResponse<EmployeeFormState>>(this.base, payload).pipe(
      map((r) => (r.success && r.data ? this.mapToForm(r.data) : null)),
      catchError(() => of(null))
    );
  }

  private normalizeLookupsBundle(raw: EmployeeLookupsBundle & { Lookups?: EmployeeLookups; Orgs?: OrgOption[] }): EmployeeLookupsBundle {
    const lookupsRaw = raw.lookups ?? raw.Lookups;
    const lk = lookupsRaw as (EmployeeLookups & Record<string, unknown>) | undefined;
    const orgs = raw.orgs ?? raw.Orgs ?? [];
    return {
      orgs: this.auth.filterSchoolOrgs(orgs.map((o) => this.normalizeOrg(o))),
      lookups: {
        userTypes: this.pickUserTypes(lk),
        designations: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'designations', 'Designations')),
        genders: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'genders', 'Genders')),
        educations: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'educations', 'Educations')),
        documents: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'documents', 'Documents')),
        qualificationTypes: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'qualificationTypes', 'QualificationTypes')),
        educationStatuses: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'educationStatuses', 'EducationStatuses'))
      }
    };
  }

  private pickArray<T>(obj: Record<string, unknown> | undefined, ...keys: string[]): T[] | undefined {
    if (!obj) return undefined;
    for (const key of keys) {
      const value = obj[key];
      if (Array.isArray(value)) return value as T[];
    }
    return undefined;
  }

  private pickUserTypes(lk: (EmployeeLookups & Record<string, unknown>) | undefined): UserTypeOption[] {
    const raw = this.pickArray<UserTypeOption>(lk, 'userTypes', 'UserTypes');
    return (raw ?? []).map((x) => this.normalizeUserType(x));
  }

  private normalizeOrg(raw: OrgOption & { OrgID?: number; OrganizationName?: string; SchoolCode?: number | null }): OrgOption {
    return {
      orgID: raw.orgID ?? raw.OrgID ?? 0,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? '',
      shortName: raw.shortName ?? null,
      schoolCode: raw.schoolCode ?? raw.SchoolCode ?? null
    };
  }

  private normalizeUserType(raw: UserTypeOption & { UserTypeID?: number; UserTypeName?: string }): UserTypeOption {
    return {
      userTypeID: raw.userTypeID ?? raw.UserTypeID ?? 0,
      userTypeName: raw.userTypeName ?? raw.UserTypeName ?? ''
    };
  }

  private normalizeCodeNames(raw?: CodeNameOption[] | null): CodeNameOption[] {
    return (raw ?? []).map((x) => ({
      code: x.code ?? (x as CodeNameOption & { Code?: number }).Code ?? 0,
      name: x.name ?? (x as CodeNameOption & { Name?: string }).Name ?? ''
    }));
  }

  private normalizeListItem(raw: EmployeeListItem & {
    UserID?: number;
    Firstname?: string;
    MiddleName?: string;
    LastName?: string;
    MobileNo1?: string;
    OrgID?: number | null;
    OrganizationName?: string;
    DesignationCode?: number | null;
    DesignationName?: string;
    UserTypeID?: number | null;
    UserTypeName?: string;
    IsActive?: boolean;
    DisplayName?: string;
  }): EmployeeListItem {
    const firstname = raw.firstname ?? raw.Firstname ?? '';
    const middleName = raw.middleName ?? raw.MiddleName ?? '';
    const lastName = raw.lastName ?? raw.LastName ?? '';
    return {
      userID: raw.userID ?? raw.UserID ?? 0,
      firstname,
      middleName,
      lastName,
      mobileNo1: raw.mobileNo1 ?? raw.MobileNo1 ?? '',
      orgID: raw.orgID ?? raw.OrgID ?? null,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? '',
      designationCode: raw.designationCode ?? raw.DesignationCode ?? null,
      designationName: raw.designationName ?? raw.DesignationName ?? '',
      userTypeID: raw.userTypeID ?? raw.UserTypeID ?? null,
      userTypeName: raw.userTypeName ?? raw.UserTypeName ?? '',
      isActive: raw.isActive ?? raw.IsActive ?? true,
      displayName: raw.displayName ?? raw.DisplayName ?? [firstname, middleName, lastName].filter(Boolean).join(' ')
    };
  }

  private mapToForm(raw: EmployeeFormState & {
    UserID?: number;
    SchoolCode?: number | null;
    OrgID?: number | null;
    UserTypeID?: number | null;
    DesignationCode?: number | null;
    Firstname?: string;
    MiddleName?: string;
    LastName?: string;
    PermanentAddress?: string;
    LocalAddress?: string;
    GenderCode?: number | null;
    Dob?: string | null;
    AdharCardNo?: string;
    MobileNo1?: string;
    MobileNo2?: string;
    EmailID?: string;
    PanNo?: string;
    Remark?: string;
    AppUserName?: string;
    AppPassword?: string;
    IsActive?: boolean;
    Education?: EmployeeFormState['education'];
    Documents?: EmployeeFormState['documents'];
    Schools?: EmployeeFormState['schools'];
  }): EmployeeFormState {
    const education = (raw.education ?? raw.Education ?? []).map((e, i) => {
      const row = e as EmployeeFormState['education'][number] & {
        EducationCodePassExam?: number | null;
        Univercity?: string;
        PassingYear?: string;
        Percentage?: string;
        QualificationTypeCode?: number | null;
        EducationStatusCode?: number | null;
        SrNo?: number;
      };
      return {
        rowId: row.rowId ?? `edu-${i}`,
        srNo: row.srNo ?? row.SrNo ?? i + 1,
        educationCodePassExam: row.educationCodePassExam ?? row.EducationCodePassExam ?? null,
        univercity: row.univercity ?? row.Univercity ?? '',
        passingYear: row.passingYear ?? row.PassingYear ?? '',
        percentage: row.percentage ?? row.Percentage ?? '',
        qualificationTypeCode: row.qualificationTypeCode ?? row.QualificationTypeCode ?? null,
        educationStatusCode: row.educationStatusCode ?? row.EducationStatusCode ?? null
      };
    });

    const documents = (raw.documents ?? raw.Documents ?? []).map((d, i) => {
      const row = d as EmployeeFormState['documents'][number] & {
        EmpDocumentCode?: number | null;
        EmpDocumentPath?: string;
      };
      const path = row.empDocumentPath ?? row.EmpDocumentPath ?? '';
      return {
        rowId: row.rowId ?? `doc-${i}`,
        empDocumentCode: row.empDocumentCode ?? row.EmpDocumentCode ?? null,
        empDocumentPath: path,
        selectedFileName: path || (row.selectedFileName ?? null)
      };
    });

    const schools = (raw.schools ?? raw.Schools ?? []).map((s, i) => {
      const row = s as EmployeeFormState['schools'][number] & {
        OrgID?: number | null;
        SchoolCode?: number | null;
        DesignationCode?: number | null;
        TeachClass?: string;
        TeachSubject?: string;
        SchoolJoiningDate?: string | null;
        SchoolLeaveDate?: string | null;
        SansthaTransferOrderNoAndDate?: string;
        ZPTransferOrderNoAndDate?: string;
        SrNo?: number;
      };
      return {
        rowId: row.rowId ?? `sch-${i}`,
        srNo: row.srNo ?? row.SrNo ?? i + 1,
        orgID: row.orgID ?? row.OrgID ?? null,
        schoolCode: row.schoolCode ?? row.SchoolCode ?? null,
        designationCode: row.designationCode ?? row.DesignationCode ?? null,
        teachClass: row.teachClass ?? row.TeachClass ?? '',
        teachSubject: row.teachSubject ?? row.TeachSubject ?? '',
        schoolJoiningDate: this.toDateInput(row.schoolJoiningDate ?? row.SchoolJoiningDate),
        schoolLeaveDate: this.toDateInput(row.schoolLeaveDate ?? row.SchoolLeaveDate),
        sansthaTransferOrderNoAndDate: row.sansthaTransferOrderNoAndDate ?? row.SansthaTransferOrderNoAndDate ?? '',
        zpTransferOrderNoAndDate: row.zpTransferOrderNoAndDate ?? row.ZPTransferOrderNoAndDate ?? ''
      };
    });

    return {
      userID: raw.userID ?? raw.UserID ?? null,
      schoolCode: raw.schoolCode ?? raw.SchoolCode ?? null,
      orgID: raw.orgID ?? raw.OrgID ?? null,
      userTypeID: raw.userTypeID ?? raw.UserTypeID ?? null,
      designationCode: raw.designationCode ?? raw.DesignationCode ?? null,
      firstname: raw.firstname ?? raw.Firstname ?? '',
      middleName: raw.middleName ?? raw.MiddleName ?? '',
      lastName: raw.lastName ?? raw.LastName ?? '',
      permanentAddress: raw.permanentAddress ?? raw.PermanentAddress ?? '',
      localAddress: raw.localAddress ?? raw.LocalAddress ?? '',
      genderCode: raw.genderCode ?? raw.GenderCode ?? null,
      dob: this.toDateInput(raw.dob ?? raw.Dob),
      adharCardNo: raw.adharCardNo ?? raw.AdharCardNo ?? '',
      mobileNo1: raw.mobileNo1 ?? raw.MobileNo1 ?? '',
      mobileNo2: raw.mobileNo2 ?? raw.MobileNo2 ?? '',
      emailID: raw.emailID ?? raw.EmailID ?? '',
      panNo: raw.panNo ?? raw.PanNo ?? '',
      remark: raw.remark ?? raw.Remark ?? '',
      appUserName: raw.appUserName ?? raw.AppUserName ?? '',
      appPassword: raw.appPassword ?? raw.AppPassword ?? '',
      isActive: raw.isActive ?? raw.IsActive ?? true,
      education,
      documents,
      schools
    };
  }

  private toDateInput(value: unknown): string {
    if (!value) return '';
    const text = String(value);
    return text.length >= 10 ? text.slice(0, 10) : text;
  }
}
