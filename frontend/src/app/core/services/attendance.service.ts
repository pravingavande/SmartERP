import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  AttendanceLeaveRequest,
  AttendanceMonthlyOffChange,
  AttendanceMonthlyOffPlan,
  AttendancePayrollRow,
  AttendanceRecord,
  AttendanceShift,
  AttendanceStats,
  SaveAttendanceShiftPayload
} from '../models/attendance.model';
import { apiData, apiMessage, apiSuccess } from '../utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly base = `${environment.apiBaseUrl}/attendance`;

  constructor(private readonly http: HttpClient) {}

  getStats(orgId: number, date?: string): Observable<AttendanceStats | null> {
    let params = new HttpParams().set('orgId', String(orgId));
    if (date) params = params.set('date', date);
    return this.http.get<ApiResponse<AttendanceStats>>(`${this.base}/stats`, { params }).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? this.normalizeStats(apiData(r)!) : null)),
      catchError(() => of(null))
    );
  }

  getShifts(orgId: number): Observable<AttendanceShift[]> {
    const params = new HttpParams().set('orgId', String(orgId));
    return this.http.get<ApiResponse<AttendanceShift[]>>(`${this.base}/shifts`, { params }).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? apiData(r)!.map((x) => this.normalizeShift(x)) : [])),
      catchError(() => of([]))
    );
  }

  createShift(payload: SaveAttendanceShiftPayload): Observable<{ data: AttendanceShift | null; message?: string }> {
    return this.http.post<ApiResponse<AttendanceShift>>(`${this.base}/shifts`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeShift(apiData(r)!) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to create shift.' }))
    );
  }

  updateShift(
    shiftId: number,
    payload: SaveAttendanceShiftPayload
  ): Observable<{ data: AttendanceShift | null; message?: string }> {
    return this.http.put<ApiResponse<AttendanceShift>>(`${this.base}/shifts/${shiftId}`, payload).pipe(
      map((r) => ({
        data: apiSuccess(r) && apiData(r) ? this.normalizeShift(apiData(r)!) : null,
        message: apiMessage(r)
      })),
      catchError(() => of({ data: null, message: 'Unable to update shift.' }))
    );
  }

  deleteShift(shiftId: number, orgId: number): Observable<{ success: boolean; message?: string }> {
    const params = new HttpParams().set('orgId', String(orgId));
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/shifts/${shiftId}`, { params }).pipe(
      map((r) => ({ success: apiSuccess(r), message: apiMessage(r) })),
      catchError(() => of({ success: false, message: 'Unable to delete shift.' }))
    );
  }

  getRecords(orgId: number, from: string, to: string, userId?: number | null): Observable<AttendanceRecord[]> {
    let params = new HttpParams().set('orgId', String(orgId)).set('from', from).set('to', to);
    if (userId) params = params.set('userId', String(userId));
    return this.http.get<ApiResponse<AttendanceRecord[]>>(`${this.base}/records`, { params }).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? apiData(r)!.map((x) => this.normalizeRecord(x)) : [])),
      catchError(() => of([]))
    );
  }

  getMonthlyOffPlan(orgId: number, year: number, month: number): Observable<AttendanceMonthlyOffPlan | null> {
    const params = new HttpParams()
      .set('orgId', String(orgId))
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<ApiResponse<AttendanceMonthlyOffPlan>>(`${this.base}/monthly-off`, { params }).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? this.normalizeMonthlyOffPlan(apiData(r)!) : null)),
      catchError(() => of(null))
    );
  }

  saveMonthlyOffPlan(
    orgId: number,
    year: number,
    month: number,
    changes: AttendanceMonthlyOffChange[]
  ): Observable<{ updated: number; message?: string }> {
    return this.http
      .put<ApiResponse<{ updated?: number; Updated?: number }>>(`${this.base}/monthly-off`, {
        orgID: orgId,
        year,
        month,
        changes
      })
      .pipe(
        map((r) => {
          const data = apiData(r);
          const updated = Number(data?.updated ?? data?.Updated ?? 0);
          return { updated, message: apiMessage(r) };
        }),
        catchError(() => of({ updated: 0, message: 'Unable to save monthly week-off plan.' }))
      );
  }

  getLeaveRequests(
    orgId: number,
    status?: string | null,
    from?: string | null,
    to?: string | null
  ): Observable<AttendanceLeaveRequest[]> {
    let params = new HttpParams().set('orgId', String(orgId));
    if (status) params = params.set('status', status);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApiResponse<AttendanceLeaveRequest[]>>(`${this.base}/leave-requests`, { params }).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? apiData(r)!.map((x) => this.normalizeLeaveRequest(x)) : [])),
      catchError(() => of([]))
    );
  }

  reviewLeaveRequest(
    id: number,
    orgId: number,
    status: 'approved' | 'rejected',
    comment?: string | null
  ): Observable<{ success: boolean; message?: string }> {
    return this.http
      .patch<ApiResponse<unknown>>(`${this.base}/leave-requests/${id}/review`, {
        orgID: orgId,
        status,
        comment: comment ?? null
      })
      .pipe(
        map((r) => ({ success: apiSuccess(r), message: apiMessage(r) })),
        catchError(() => of({ success: false, message: 'Unable to review leave request.' }))
      );
  }

  getTeamPayroll(orgId: number, year: number, month: number): Observable<AttendancePayrollRow[]> {
    const params = new HttpParams()
      .set('orgId', String(orgId))
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<ApiResponse<AttendancePayrollRow[]>>(`${this.base}/payroll/team`, { params }).pipe(
      map((r) => (apiSuccess(r) && apiData(r) ? apiData(r)!.map((x) => this.normalizePayrollRow(x)) : [])),
      catchError(() => of([]))
    );
  }

  reverseAttendance(
    orgId: number,
    attendanceId: number,
    eventType: 'check_in' | 'check_out',
    reason: string
  ): Observable<{ success: boolean; message?: string }> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/corrections/reverse`, {
        orgID: orgId,
        attendanceID: attendanceId,
        eventType,
        reason
      })
      .pipe(
        map((r) => ({ success: apiSuccess(r), message: apiMessage(r) })),
        catchError((err) =>
          of({
            success: false,
            message: (err as { error?: ApiResponse<unknown> })?.error
              ? apiMessage((err as { error: ApiResponse<unknown> }).error)
              : 'Unable to reverse attendance.'
          })
        )
      );
  }

  forceCheckout(
    orgId: number,
    attendanceId: number,
    reason: string,
    checkoutAt?: string | null
  ): Observable<{ success: boolean; message?: string }> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/corrections/force-checkout`, {
        orgID: orgId,
        attendanceID: attendanceId,
        reason,
        checkoutAt: checkoutAt ?? null
      })
      .pipe(
        map((r) => ({ success: apiSuccess(r), message: apiMessage(r) })),
        catchError((err) =>
          of({
            success: false,
            message: (err as { error?: ApiResponse<unknown> })?.error
              ? apiMessage((err as { error: ApiResponse<unknown> }).error)
              : 'Unable to force check-out.'
          })
        )
      );
  }

  private pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
      const value = raw[key];
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  }

  private pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
    const value = this.pick(raw, ...keys);
    return value == null ? '' : String(value);
  }

  private pickNum(raw: Record<string, unknown>, ...keys: string[]): number {
    const value = this.pick(raw, ...keys);
    return value == null ? 0 : Number(value);
  }

  private pickNumOrNull(raw: Record<string, unknown>, ...keys: string[]): number | null {
    const value = this.pick(raw, ...keys);
    return value == null ? null : Number(value);
  }

  private asRecord(raw: unknown): Record<string, unknown> {
    return (raw ?? {}) as Record<string, unknown>;
  }

  private normalizeShift(raw: unknown): AttendanceShift {
    const r = this.asRecord(raw);
    return {
      shiftID: this.pickNum(r, 'shiftID', 'ShiftID'),
      orgID: this.pickNum(r, 'orgID', 'OrgID'),
      shiftName: this.pickStr(r, 'shiftName', 'ShiftName'),
      shiftCode: this.pickStr(r, 'shiftCode', 'ShiftCode'),
      startTime: this.pickStr(r, 'startTime', 'StartTime'),
      endTime: this.pickStr(r, 'endTime', 'EndTime'),
      graceMinutes: this.pickNum(r, 'graceMinutes', 'GraceMinutes'),
      earlyCheckinMinutes: this.pickNum(r, 'earlyCheckinMinutes', 'EarlyCheckinMinutes'),
      isNightShift: !!this.pick(r, 'isNightShift', 'IsNightShift'),
      workingDays: this.pickStr(r, 'workingDays', 'WorkingDays') || '1111100',
      isActive: this.pick(r, 'isActive', 'IsActive') !== false,
      timingMode: this.pickStr(r, 'timingMode', 'TimingMode') || 'fixed',
      requiredWorkMinutes: this.pickNumOrNull(r, 'requiredWorkMinutes', 'RequiredWorkMinutes'),
      lunchMinutes: this.pickNum(r, 'lunchMinutes', 'LunchMinutes') || 60
    };
  }

  private normalizeRecord(raw: unknown): AttendanceRecord {
    const r = this.asRecord(raw);
    return {
      attendanceID: this.pickNum(r, 'attendanceID', 'AttendanceID'),
      orgID: this.pickNum(r, 'orgID', 'OrgID'),
      userID: this.pickNum(r, 'userID', 'UserID'),
      userName: this.pick(r, 'userName', 'UserName') as string | null | undefined,
      employeeCode: this.pick(r, 'employeeCode', 'EmployeeCode') as string | null | undefined,
      attendanceDate: this.pickStr(r, 'attendanceDate', 'AttendanceDate'),
      checkInTime: this.pick(r, 'checkInTime', 'CheckInTime') as string | null | undefined,
      checkOutTime: this.pick(r, 'checkOutTime', 'CheckOutTime') as string | null | undefined,
      officeName: this.pick(r, 'officeName', 'OfficeName') as string | null | undefined,
      checkInPendingConfirmation: !!this.pick(r, 'checkInPendingConfirmation', 'CheckInPendingConfirmation'),
      checkOutPendingConfirmation: !!this.pick(r, 'checkOutPendingConfirmation', 'CheckOutPendingConfirmation'),
      totalHours: this.pickNumOrNull(r, 'totalHours', 'TotalHours'),
      netHours: this.pickNumOrNull(r, 'netHours', 'NetHours'),
      isDayComplete: !!this.pick(r, 'isDayComplete', 'IsDayComplete'),
      timingMode: this.pickStr(r, 'timingMode', 'TimingMode') || 'fixed'
    };
  }

  private normalizeLeaveRequest(raw: unknown): AttendanceLeaveRequest {
    const r = this.asRecord(raw);
    return {
      leaveRequestID: this.pickNum(r, 'leaveRequestID', 'LeaveRequestID'),
      orgID: this.pickNum(r, 'orgID', 'OrgID'),
      userID: this.pickNum(r, 'userID', 'UserID'),
      userName: this.pick(r, 'userName', 'UserName') as string | null | undefined,
      employeeCode: this.pick(r, 'employeeCode', 'EmployeeCode') as string | null | undefined,
      leaveType: this.pickStr(r, 'leaveType', 'LeaveType'),
      startDate: this.pickStr(r, 'startDate', 'StartDate').slice(0, 10),
      endDate: this.pickStr(r, 'endDate', 'EndDate').slice(0, 10),
      reason: this.pick(r, 'reason', 'Reason') as string | null | undefined,
      status: this.pickStr(r, 'status', 'Status') || 'pending',
      reviewComment: this.pick(r, 'reviewComment', 'ReviewComment') as string | null | undefined
    };
  }

  private normalizeMonthlyOffPlan(raw: unknown): AttendanceMonthlyOffPlan {
    const r = this.asRecord(raw);
    const employees = (this.pick(r, 'employees', 'Employees') as unknown[] | undefined) ?? [];
    const dayHeaders = (this.pick(r, 'dayHeaders', 'DayHeaders') as unknown[] | undefined) ?? [];
    return {
      year: this.pickNum(r, 'year', 'Year'),
      month: this.pickNum(r, 'month', 'Month'),
      monthLabel: this.pickStr(r, 'monthLabel', 'MonthLabel'),
      dayHeaders: dayHeaders.map((item) => {
        const h = this.asRecord(item);
        return {
          date: this.pickStr(h, 'date', 'Date'),
          day: this.pickNum(h, 'day', 'Day'),
          weekday: this.pickStr(h, 'weekday', 'Weekday'),
          isSunday: !!this.pick(h, 'isSunday', 'IsSunday')
        };
      }),
      employees: employees.map((item) => {
        const e = this.asRecord(item);
        const days = (this.pick(e, 'days', 'Days') as unknown[] | undefined) ?? [];
        return {
          userID: this.pickNum(e, 'userID', 'UserID'),
          name: this.pickStr(e, 'name', 'Name'),
          employeeCode: this.pickStr(e, 'employeeCode', 'EmployeeCode'),
          days: days.map((dayItem) => {
            const d = this.asRecord(dayItem);
            return {
              date: this.pickStr(d, 'date', 'Date'),
              defaultOff: !!this.pick(d, 'defaultOff', 'DefaultOff'),
              effectiveOff: !!this.pick(d, 'effectiveOff', 'EffectiveOff'),
              override: this.pick(d, 'override', 'Override') as string | null | undefined
            };
          })
        };
      })
    };
  }

  private normalizeStats(raw: unknown): AttendanceStats {
    const r = this.asRecord(raw);
    return {
      totalEmployees: this.pickNum(r, 'totalEmployees', 'TotalEmployees'),
      todayAttendance: this.pickNum(r, 'todayAttendance', 'TodayAttendance'),
      lateCheckIns: this.pickNum(r, 'lateCheckIns', 'LateCheckIns'),
      absentEmployees: this.pickNum(r, 'absentEmployees', 'AbsentEmployees'),
      leaveCount: this.pickNum(r, 'leaveCount', 'LeaveCount'),
      weekOffCount: this.pickNum(r, 'weekOffCount', 'WeekOffCount'),
      pendingConfirmations: this.pickNum(r, 'pendingConfirmations', 'PendingConfirmations')
    };
  }

  private normalizePayrollRow(raw: unknown): AttendancePayrollRow {
    const r = this.asRecord(raw);
    return {
      employeeID: this.pickNum(r, 'employeeID', 'EmployeeID'),
      employeeName: this.pickStr(r, 'employeeName', 'EmployeeName'),
      employeeCode: this.pickStr(r, 'employeeCode', 'EmployeeCode'),
      monthlySalary: this.pickNum(r, 'monthlySalary', 'MonthlySalary'),
      presentDays: this.pickNum(r, 'presentDays', 'PresentDays'),
      leaveDays: this.pickNum(r, 'leaveDays', 'LeaveDays'),
      absentDays: this.pickNum(r, 'absentDays', 'AbsentDays'),
      weeklyOffDays: this.pickNum(r, 'weeklyOffDays', 'WeeklyOffDays'),
      payableSalary: this.pickNum(r, 'payableSalary', 'PayableSalary'),
      salaryConfigured: !!this.pick(r, 'salaryConfigured', 'SalaryConfigured'),
      monthLabel: this.pickStr(r, 'monthLabel', 'MonthLabel')
    };
  }
}
