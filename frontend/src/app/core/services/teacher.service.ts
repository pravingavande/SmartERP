import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { OrgOption } from '../models/audit.model';
import {
  ApiResponse,
  CodeNameOption,
  IdNameOption,
  TeacherFormState,
  TeacherListFilter,
  TeacherListItem,
  TeacherLookups,
  TeacherLookupsBundle,
  TeacherDocumentLine,
  TeacherSchoolLine,
  TEACHER_STAFF_TYPE_ID,
  UserRoleOption
} from '../models/teacher.model';

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly base = `${environment.apiBaseUrl}/teacher`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getLookups(): Observable<TeacherLookupsBundle | null> {
    return this.http.get<ApiResponse<TeacherLookupsBundle>>(`${this.base}/lookups`).pipe(
      map((r) => (r.success && r.data ? this.normalizeLookupsBundle(r.data) : null)),
      catchError(() => of(null))
    );
  }

  getNextSrNo(orgId: number): Observable<number | null> {
    const params = new HttpParams().set('orgId', orgId.toString());
    return this.http.get<ApiResponse<{ nextSrNo: number }>>(`${this.base}/next-srno`, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.nextSrNo ?? (r.data as { NextSrNo?: number }).NextSrNo ?? null : null)),
      catchError(() => of(null))
    );
  }

  getList(filter: TeacherListFilter): Observable<TeacherListItem[]> {
    let params = new HttpParams();
    if (filter.orgId) params = params.set('orgID', filter.orgId.toString());
    if (filter.search?.trim()) params = params.set('search', filter.search.trim());
    if (filter.shalarthID?.trim()) params = params.set('shalarthID', filter.shalarthID.trim());
    if (filter.mobileNo?.trim()) params = params.set('mobileNo', filter.mobileNo.trim());
    if (filter.designationCode) params = params.set('designationCode', filter.designationCode.toString());
    if (filter.subject?.trim()) params = params.set('subject', filter.subject.trim());
    if (filter.userRoleID) params = params.set('userRoleID', filter.userRoleID.toString());
    if (filter.isActive !== null && filter.isActive !== undefined) {
      params = params.set('isActive', filter.isActive.toString());
    }

    return this.http.get<ApiResponse<TeacherListItem[]>>(this.base, { params }).pipe(
      map((r) => (r.success && r.data ? r.data.map((item) => this.normalizeListItem(item)) : [])),
      catchError(() => of([]))
    );
  }

  getById(userId: number): Observable<TeacherFormState | null> {
    return this.http.get<ApiResponse<Record<string, unknown>>>(`${this.base}/${userId}`).pipe(
      map((r) => (r.success && r.data ? this.mapToForm(r.data) : null)),
      catchError(() => of(null))
    );
  }

  save(form: TeacherFormState): Observable<{ data: TeacherFormState | null; message?: string }> {
    const payload = {
      userID: form.userID ?? 0,
      orgID: form.orgID,
      staffTypeID: form.staffTypeID ?? TEACHER_STAFF_TYPE_ID,
      userRoleID: form.userRoleID,
      designationCode: form.designationCode,
      firstname: form.firstname,
      middleName: form.middleName,
      lastName: form.lastName,
      employeeShortName: form.employeeShortName,
      permanentAddress: form.permanentAddress,
      cityName: form.cityName,
      photoPath: form.photoPath || null,
      genderCode: form.genderCode,
      dob: form.dob || null,
      adharCardNo: form.adharCardNo,
      shalarthID: form.shalarthID,
      scaleOfPay: form.scaleOfPay,
      casteName: form.casteName,
      religionID: form.religionID,
      categoryID: form.categoryID,
      bloodGroupID: form.bloodGroupID,
      mobileNo1: form.mobileNo1,
      mobileNo2: form.mobileNo2,
      emailID: form.emailID,
      panNo: form.panNo,
      remark: form.remark,
      subjectName1: form.subjectName1,
      subjectName2: form.subjectName2,
      subjectName3: form.subjectName3,
      sQualification: form.sQualification,
      bQualification: form.bQualification,
      afterDegreePassedSubjects: form.afterDegreePassedSubjects,
      sansthaOrderNoAndDate: form.sansthaOrderNoAndDate,
      zpOrderNoAndDate: form.zpOrderNoAndDate,
      sansthaServiceOrderNoAndDate: form.sansthaServiceOrderNoAndDate,
      zpServiceOrderNoAndDate: form.zpServiceOrderNoAndDate,
      dateOfWorkingStart: form.dateOfWorkingStart || null,
      jtCategoryID: form.jtCategoryID,
      paymentGradeDate: form.paymentGradeDate || null,
      nivadGradeDate: form.nivadGradeDate || null,
      retirementYear: form.retirementYear,
      serviceOutDate: form.serviceOutDate || null,
      shiftID: form.shiftID,
      appUserName: form.appUserName,
      appPassword: form.appPassword || null,
      closeFlag: form.closeFlag,
      isActive: form.isActive,
      documents: form.documents
        .filter((d) => d.empDocumentCode)
        .map((d) => ({ empDocumentCode: d.empDocumentCode, empDocumentPath: d.empDocumentPath || '' })),
      schools: form.schools
        .filter((s) => s.orgID || s.designationCode || s.teachClass || s.teachSubject)
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

    return this.http.post<ApiResponse<Record<string, unknown>>>(this.base, payload).pipe(
      map((r) => ({ data: r.success && r.data ? this.mapToForm(r.data) : null, message: r.message })),
      catchError(() => of({ data: null, message: 'Unable to save teacher.' }))
    );
  }

  delete(userId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${userId}`).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }

  resetPassword(userId: number, password: string): Observable<boolean> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${userId}/reset-password`, { appPassword: password }).pipe(
      map((r) => r.success),
      catchError(() => of(false))
    );
  }

  uploadPhoto(file: File): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<string>>(`${this.base}/upload-photo`, formData).pipe(
      map((r) => (r.success && r.data ? r.data : null)),
      catchError(() => of(null))
    );
  }

  photoUrl(fileName: string | null | undefined): string | null {
    if (!fileName?.trim()) return null;
    return `${this.base}/photo/${encodeURIComponent(fileName.trim())}`;
  }

  private normalizeLookupsBundle(raw: TeacherLookupsBundle & { Lookups?: TeacherLookups; Orgs?: OrgOption[] }): TeacherLookupsBundle {
    const lookupsRaw = raw.lookups ?? raw.Lookups;
    const lk = lookupsRaw as (TeacherLookups & Record<string, unknown>) | undefined;
    const orgs = raw.orgs ?? raw.Orgs ?? [];
    return {
      orgs: this.auth.filterSchoolOrgs(orgs.map((o) => this.normalizeOrg(o))),
      lookups: {
        staffTypes: this.normalizeIdNames(this.pickArray<IdNameOption>(lk, 'staffTypes', 'StaffTypes')),
        userRoles: this.pickUserRoles(lk),
        designations: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'designations', 'Designations')),
        genders: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'genders', 'Genders')),
        religions: this.normalizeIdNames(this.pickArray<IdNameOption>(lk, 'religions', 'Religions')),
        categories: this.normalizeIdNames(this.pickArray<IdNameOption>(lk, 'categories', 'Categories')),
        bloodGroups: this.normalizeIdNames(this.pickArray<IdNameOption>(lk, 'bloodGroups', 'BloodGroups')),
        shifts: this.normalizeIdNames(this.pickArray<IdNameOption>(lk, 'shifts', 'Shifts')),
        documents: this.normalizeCodeNames(this.pickArray<CodeNameOption>(lk, 'documents', 'Documents'))
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

  private pickUserRoles(lk: (TeacherLookups & Record<string, unknown>) | undefined): UserRoleOption[] {
    const raw = this.pickArray<UserRoleOption>(lk, 'userRoles', 'UserRoles');
    return (raw ?? []).map((x) => ({
      userRoleID: x.userRoleID ?? (x as UserRoleOption & { UserRoleID?: number }).UserRoleID ?? 0,
      userRoleName: x.userRoleName ?? (x as UserRoleOption & { UserRoleName?: string }).UserRoleName ?? ''
    }));
  }

  private normalizeOrg(raw: OrgOption & { OrgID?: number; OrganizationName?: string; SchoolCode?: number | null }): OrgOption {
    return {
      orgID: raw.orgID ?? raw.OrgID ?? 0,
      organizationName: raw.organizationName ?? raw.OrganizationName ?? '',
      shortName: raw.shortName ?? null,
      schoolCode: raw.schoolCode ?? raw.SchoolCode ?? null
    };
  }

  private normalizeCodeNames(raw?: CodeNameOption[] | null): CodeNameOption[] {
    return (raw ?? []).map((x) => ({
      code: x.code ?? (x as CodeNameOption & { Code?: number }).Code ?? 0,
      name: x.name ?? (x as CodeNameOption & { Name?: string }).Name ?? ''
    }));
  }

  private normalizeIdNames(raw?: IdNameOption[] | null): IdNameOption[] {
    return (raw ?? []).map((x) => ({
      id: x.id ?? (x as IdNameOption & { Id?: number; ReligionID?: number; CategoryID?: number; BloodGroupID?: number; ShiftID?: number; StaffTypeID?: number }).Id
        ?? (x as { ReligionID?: number }).ReligionID
        ?? (x as { CategoryID?: number }).CategoryID
        ?? (x as { BloodGroupID?: number }).BloodGroupID
        ?? (x as { ShiftID?: number }).ShiftID
        ?? (x as { StaffTypeID?: number }).StaffTypeID
        ?? 0,
      name: x.name ?? (x as IdNameOption & { Name?: string; ReligionName?: string; CategoryName?: string; BloodGroupName?: string; ShiftName?: string; StaffTypeName?: string }).Name
        ?? (x as { ReligionName?: string }).ReligionName
        ?? (x as { CategoryName?: string }).CategoryName
        ?? (x as { BloodGroupName?: string }).BloodGroupName
        ?? (x as { ShiftName?: string }).ShiftName
        ?? (x as { StaffTypeName?: string }).StaffTypeName
        ?? ''
    }));
  }

  private normalizeListItem(raw: unknown): TeacherListItem {
    const r = raw as Record<string, unknown>;
    const firstname = String(r['firstname'] ?? r['Firstname'] ?? '');
    const middleName = String(r['middleName'] ?? r['MiddleName'] ?? '');
    const lastName = String(r['lastName'] ?? r['LastName'] ?? '');
    return {
      userID: Number(r['userID'] ?? r['UserID'] ?? 0),
      srNo: (r['srNo'] ?? r['SrNo'] ?? null) as number | null,
      firstname,
      middleName,
      lastName,
      employeeName: String(r['employeeName'] ?? r['EmployeeName'] ?? ''),
      employeeShortName: String(r['employeeShortName'] ?? r['EmployeeShortName'] ?? ''),
      mobileNo1: String(r['mobileNo1'] ?? r['MobileNo1'] ?? ''),
      shalarthID: String(r['shalarthID'] ?? r['ShalarthID'] ?? ''),
      orgID: (r['orgID'] ?? r['OrgID'] ?? null) as number | null,
      organizationName: String(r['organizationName'] ?? r['OrganizationName'] ?? ''),
      designationCode: (r['designationCode'] ?? r['DesignationCode'] ?? null) as number | null,
      designationName: String(r['designationName'] ?? r['DesignationName'] ?? ''),
      userRoleID: (r['userRoleID'] ?? r['UserRoleID'] ?? null) as number | null,
      userRoleName: String(r['userRoleName'] ?? r['UserRoleName'] ?? ''),
      staffTypeID: (r['staffTypeID'] ?? r['StaffTypeID'] ?? null) as number | null,
      staffTypeName: String(r['staffTypeName'] ?? r['StaffTypeName'] ?? ''),
      subjectName1: String(r['subjectName1'] ?? r['SubjectName1'] ?? ''),
      subjectName2: String(r['subjectName2'] ?? r['SubjectName2'] ?? ''),
      subjectName3: String(r['subjectName3'] ?? r['SubjectName3'] ?? ''),
      isActive: Boolean(r['isActive'] ?? r['IsActive'] ?? true),
      photoPath: String(r['photoPath'] ?? r['PhotoPath'] ?? ''),
      displayName: String(r['displayName'] ?? r['DisplayName'] ?? [firstname, middleName, lastName].filter(Boolean).join(' '))
    };
  }

  private mapToForm(raw: unknown): TeacherFormState {
    const r = raw as Record<string, unknown>;
    const photoPath = String(r['photoPath'] ?? r['PhotoPath'] ?? '');

    const documents = (r['documents'] ?? r['Documents'] ?? []) as unknown[];
    const schools = (r['schools'] ?? r['Schools'] ?? []) as unknown[];

    return {
      userID: (r['userID'] ?? r['UserID'] ?? null) as number | null,
      srNo: (r['srNo'] ?? r['SrNo'] ?? null) as number | null,
      orgID: (r['orgID'] ?? r['OrgID'] ?? null) as number | null,
      staffTypeID: (r['staffTypeID'] ?? r['StaffTypeID'] ?? TEACHER_STAFF_TYPE_ID) as number | null,
      userRoleID: (r['userRoleID'] ?? r['UserRoleID'] ?? null) as number | null,
      designationCode: (r['designationCode'] ?? r['DesignationCode'] ?? null) as number | null,
      firstname: String(r['firstname'] ?? r['Firstname'] ?? ''),
      middleName: String(r['middleName'] ?? r['MiddleName'] ?? ''),
      lastName: String(r['lastName'] ?? r['LastName'] ?? ''),
      employeeName: String(r['employeeName'] ?? r['EmployeeName'] ?? ''),
      employeeShortName: String(r['employeeShortName'] ?? r['EmployeeShortName'] ?? ''),
      permanentAddress: String(r['permanentAddress'] ?? r['PermanentAddress'] ?? r['address'] ?? r['Address'] ?? ''),
      cityName: String(r['cityName'] ?? r['CityName'] ?? ''),
      photoPath,
      photoPreviewUrl: this.photoUrl(photoPath),
      genderCode: (r['genderCode'] ?? r['GenderCode'] ?? null) as number | null,
      dob: this.toDateInput(r['dob'] ?? r['Dob']),
      adharCardNo: String(r['adharCardNo'] ?? r['AdharCardNo'] ?? ''),
      shalarthID: String(r['shalarthID'] ?? r['ShalarthID'] ?? ''),
      scaleOfPay: String(r['scaleOfPay'] ?? r['ScaleOfPay'] ?? ''),
      casteName: String(r['casteName'] ?? r['CasteName'] ?? ''),
      religionID: (r['religionID'] ?? r['ReligionID'] ?? null) as number | null,
      categoryID: (r['categoryID'] ?? r['CategoryID'] ?? null) as number | null,
      bloodGroupID: (r['bloodGroupID'] ?? r['BloodGroupID'] ?? null) as number | null,
      mobileNo1: String(r['mobileNo1'] ?? r['MobileNo1'] ?? ''),
      mobileNo2: String(r['mobileNo2'] ?? r['MobileNo2'] ?? ''),
      emailID: String(r['emailID'] ?? r['EmailID'] ?? ''),
      panNo: String(r['panNo'] ?? r['PanNo'] ?? ''),
      remark: String(r['remark'] ?? r['Remark'] ?? ''),
      subjectName1: String(r['subjectName1'] ?? r['SubjectName1'] ?? ''),
      subjectName2: String(r['subjectName2'] ?? r['SubjectName2'] ?? ''),
      subjectName3: String(r['subjectName3'] ?? r['SubjectName3'] ?? ''),
      sQualification: String(r['sQualification'] ?? r['SQualification'] ?? ''),
      bQualification: String(r['bQualification'] ?? r['BQualification'] ?? ''),
      afterDegreePassedSubjects: String(r['afterDegreePassedSubjects'] ?? r['AfterDegreePassedSubjects'] ?? ''),
      sansthaOrderNoAndDate: String(r['sansthaOrderNoAndDate'] ?? r['SansthaOrderNoAndDate'] ?? ''),
      zpOrderNoAndDate: String(r['zpOrderNoAndDate'] ?? r['ZPOrderNoAndDate'] ?? ''),
      sansthaServiceOrderNoAndDate: String(r['sansthaServiceOrderNoAndDate'] ?? r['SansthaServiceOrderNoAndDate'] ?? ''),
      zpServiceOrderNoAndDate: String(r['zpServiceOrderNoAndDate'] ?? r['ZPServiceOrderNoAndDate'] ?? ''),
      dateOfWorkingStart: this.toDateInput(r['dateOfWorkingStart'] ?? r['DateOfWorkingStart']),
      jtCategoryID: (r['jtCategoryID'] ?? r['JTCategoryID'] ?? null) as number | null,
      paymentGradeDate: this.toDateInput(r['paymentGradeDate'] ?? r['PaymentGradeDate']),
      nivadGradeDate: this.toDateInput(r['nivadGradeDate'] ?? r['NivadGradeDate']),
      retirementYear: (r['retirementYear'] ?? r['RetirementYear'] ?? null) as number | null,
      serviceOutDate: this.toDateInput(r['serviceOutDate'] ?? r['ServiceOutDate']),
      shiftID: (r['shiftID'] ?? r['ShiftID'] ?? null) as number | null,
      appUserName: String(r['appUserName'] ?? r['AppUserName'] ?? ''),
      appPassword: '',
      closeFlag: Boolean(r['closeFlag'] ?? r['CloseFlag'] ?? false),
      isActive: Boolean(r['isActive'] ?? r['IsActive'] ?? true),
      createdAt: this.toDateInput(r['createdAt'] ?? r['CreatedAt']),
      documents: documents.map((d, i) => this.mapDocumentLine(d, i)),
      schools: schools.map((s, i) => this.mapSchoolLine(s, i))
    };
  }

  private mapDocumentLine(raw: unknown, index: number): TeacherDocumentLine {
    const d = raw as Record<string, unknown>;
    const path = String(d['empDocumentPath'] ?? d['EmpDocumentPath'] ?? '');
    return {
      rowId: `doc-${index}`,
      empDocumentCode: (d['empDocumentCode'] ?? d['EmpDocumentCode'] ?? null) as number | null,
      empDocumentPath: path,
      selectedFileName: path || null
    };
  }

  private mapSchoolLine(raw: unknown, index: number): TeacherSchoolLine {
    const s = raw as Record<string, unknown>;
    return {
      rowId: `sch-${index}`,
      srNo: Number(s['srNo'] ?? s['SrNo'] ?? index + 1),
      orgID: (s['orgID'] ?? s['OrgID'] ?? null) as number | null,
      schoolCode: (s['schoolCode'] ?? s['SchoolCode'] ?? null) as number | null,
      designationCode: (s['designationCode'] ?? s['DesignationCode'] ?? null) as number | null,
      teachClass: String(s['teachClass'] ?? s['TeachClass'] ?? ''),
      teachSubject: String(s['teachSubject'] ?? s['TeachSubject'] ?? ''),
      schoolJoiningDate: this.toDateInput(s['schoolJoiningDate'] ?? s['SchoolJoiningDate']),
      schoolLeaveDate: this.toDateInput(s['schoolLeaveDate'] ?? s['SchoolLeaveDate']),
      sansthaTransferOrderNoAndDate: String(s['sansthaTransferOrderNoAndDate'] ?? s['SansthaTransferOrderNoAndDate'] ?? ''),
      zpTransferOrderNoAndDate: String(s['zpTransferOrderNoAndDate'] ?? s['ZPTransferOrderNoAndDate'] ?? '')
    };
  }

  private toDateInput(value: unknown): string {
    if (!value) return '';
    const text = String(value);
    return text.length >= 10 ? text.slice(0, 10) : text;
  }
}
