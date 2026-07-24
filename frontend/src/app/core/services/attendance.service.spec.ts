import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AttendanceService } from './attendance.service';
import { environment } from '../../../environments/environment';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiBaseUrl}/attendance`;

  const sampleShiftApi = {
    shiftID: 5,
    orgID: 101,
    shiftName: 'Morning Shift',
    shiftCode: 'MORNING',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    earlyCheckinMinutes: 60,
    isNightShift: false,
    workingDays: '1111100',
    isActive: true,
    timingMode: 'fixed',
    requiredWorkMinutes: 480,
    lunchMinutes: 60
  };

  const sampleRecordApi = {
    attendanceID: 50,
    orgID: 101,
    userID: 201,
    userName: 'Ravi Patil',
    employeeCode: 'EMP001',
    attendanceDate: '2026-07-20',
    checkInTime: '2026-07-20T04:00:00Z',
    checkOutTime: '2026-07-20T13:00:00Z',
    isDayComplete: true,
    netHours: 8
  };

  const sampleLeaveApi = {
    leaveRequestID: 7,
    orgID: 101,
    userID: 201,
    userName: 'Ravi Patil',
    employeeCode: 'EMP001',
    leaveType: 'casual',
    startDate: '2026-07-21',
    endDate: '2026-07-22',
    reason: 'Family function',
    status: 'pending'
  };

  const samplePayrollApi = {
    employeeID: 201,
    employeeName: 'Ravi Patil',
    employeeCode: 'EMP001',
    monthlySalary: 22000,
    presentDays: 18,
    leaveDays: 2,
    absentDays: 2,
    weeklyOffDays: 8,
    payableSalary: 20000,
    salaryConfigured: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AttendanceService]
    });
    service = TestBed.inject(AttendanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getShifts normalizes API response', () => {
    service.getShifts(101).subscribe((rows) => {
      expect(rows.length).toBe(1);
      expect(rows[0].shiftID).toBe(5);
      expect(rows[0].shiftCode).toBe('MORNING');
      expect(rows[0].isActive).toBeTrue();
    });

    const req = httpMock.expectOne((r) => r.url === `${base}/shifts` && r.params.get('orgId') === '101');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [sampleShiftApi] });
  });

  it('createShift posts payload and returns saved shift', () => {
    service
      .createShift({
        orgID: 101,
        shiftName: 'Morning Shift',
        shiftCode: 'morning',
        startTime: '09:00',
        endTime: '18:00',
        timingMode: 'fixed',
        workingDays: '1111100'
      })
      .subscribe((result) => {
        expect(result.data?.shiftID).toBe(5);
        expect(result.message).toBe('Shift created.');
      });

    const req = httpMock.expectOne(`${base}/shifts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.orgID).toBe(101);
    req.flush({ success: true, data: sampleShiftApi, message: 'Shift created.' });
  });

  it('getRecords passes date range and normalizes rows', () => {
    service.getRecords(101, '2026-07-20', '2026-07-20').subscribe((rows) => {
      expect(rows.length).toBe(1);
      expect(rows[0].attendanceID).toBe(50);
      expect(rows[0].userName).toBe('Ravi Patil');
      expect(rows[0].isDayComplete).toBeTrue();
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/records` &&
        r.params.get('orgId') === '101' &&
        r.params.get('from') === '2026-07-20' &&
        r.params.get('to') === '2026-07-20'
    );
    req.flush({ success: true, data: [sampleRecordApi] });
  });

  it('getLeaveRequests filters by status', () => {
    service.getLeaveRequests(101, 'pending').subscribe((rows) => {
      expect(rows[0].leaveRequestID).toBe(7);
      expect(rows[0].status).toBe('pending');
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/leave-requests` && r.params.get('status') === 'pending'
    );
    req.flush({ success: true, data: [sampleLeaveApi] });
  });

  it('reviewLeaveRequest patches review payload', () => {
    service.reviewLeaveRequest(7, 101, 'approved', 'OK').subscribe((result) => {
      expect(result.success).toBeTrue();
    });

    const req = httpMock.expectOne(`${base}/leave-requests/7/review`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ orgID: 101, status: 'approved', comment: 'OK' });
    req.flush({ success: true, message: 'Leave request reviewed.' });
  });

  it('getMonthlyOffPlan normalizes employee day grid', () => {
    service.getMonthlyOffPlan(101, 2026, 7).subscribe((plan) => {
      expect(plan?.year).toBe(2026);
      expect(plan?.employees.length).toBe(1);
      expect(plan?.employees[0].userID).toBe(201);
      expect(plan?.employees[0].days[0].date).toBe('2026-07-01');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/monthly-off` &&
        r.params.get('year') === '2026' &&
        r.params.get('month') === '7'
    );
    req.flush({
      success: true,
      data: {
        year: 2026,
        month: 7,
        monthLabel: 'July 2026',
        dayHeaders: [{ date: '2026-07-01', day: 1, weekday: 'Wed', isSunday: false }],
        employees: [
          {
            userID: 201,
            name: 'Ravi Patil',
            employeeCode: 'EMP001',
            days: [{ date: '2026-07-01', defaultOff: false, effectiveOff: false, override: null }]
          }
        ]
      }
    });
  });

  it('saveMonthlyOffPlan sends changes and returns updated count', () => {
    service
      .saveMonthlyOffPlan(101, 2026, 7, [{ userID: 201, date: '2026-07-10', override: 'off' }])
      .subscribe((result) => {
        expect(result.updated).toBe(1);
      });

    const req = httpMock.expectOne(`${base}/monthly-off`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.changes.length).toBe(1);
    req.flush({ success: true, data: { updated: 1 } });
  });

  it('getTeamPayroll normalizes payroll rows', () => {
    service.getTeamPayroll(101, 2026, 7).subscribe((rows) => {
      expect(rows[0].employeeID).toBe(201);
      expect(rows[0].monthlySalary).toBe(22000);
      expect(rows[0].payableSalary).toBe(20000);
      expect(rows[0].salaryConfigured).toBeTrue();
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/payroll/team` && r.params.get('year') === '2026'
    );
    req.flush({ success: true, data: [samplePayrollApi] });
  });

  it('reverseAttendance posts correction payload', () => {
    service.reverseAttendance(101, 50, 'check_in', 'Marked by mistake').subscribe((result) => {
      expect(result.success).toBeTrue();
    });

    const req = httpMock.expectOne(`${base}/corrections/reverse`);
    expect(req.request.body).toEqual({
      orgID: 101,
      attendanceID: 50,
      eventType: 'check_in',
      reason: 'Marked by mistake'
    });
    req.flush({ success: true, message: 'Attendance reversed.' });
  });

  it('forceCheckout posts optional checkout time', () => {
    const checkoutAt = '2026-07-20T13:00:00.000Z';
    service.forceCheckout(101, 50, 'Forgot checkout', checkoutAt).subscribe((result) => {
      expect(result.success).toBeTrue();
    });

    const req = httpMock.expectOne(`${base}/corrections/force-checkout`);
    expect(req.request.body.checkoutAt).toBe(checkoutAt);
    req.flush({ success: true, message: 'Employee checked out.' });
  });

  it('returns empty arrays when API success is false', () => {
    service.getShifts(101).subscribe((rows) => {
      expect(rows).toEqual([]);
    });

    const req = httpMock.expectOne((r) => r.url === `${base}/shifts`);
    req.flush({ success: false, message: 'Organization is required.' });
  });
});
