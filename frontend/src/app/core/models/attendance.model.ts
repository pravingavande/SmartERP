export interface AttendanceShift {
  shiftID: number;
  orgID: number;
  shiftName: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  earlyCheckinMinutes: number;
  isNightShift: boolean;
  workingDays: string;
  isActive: boolean;
  timingMode: string;
  requiredWorkMinutes?: number | null;
  lunchMinutes: number;
}

export interface SaveAttendanceShiftPayload {
  orgID: number;
  shiftName: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  graceMinutes?: number;
  earlyCheckinMinutes?: number;
  isNightShift?: boolean;
  workingDays: string;
  timingMode: string;
  requiredWorkMinutes?: number;
  lunchMinutes?: number;
  isActive?: boolean;
}

export interface AttendanceRecord {
  attendanceID: number;
  orgID: number;
  userID: number;
  userName?: string | null;
  employeeCode?: string | null;
  attendanceDate: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  officeName?: string | null;
  checkInPendingConfirmation?: boolean;
  checkOutPendingConfirmation?: boolean;
  totalHours?: number | null;
  netHours?: number | null;
  isDayComplete: boolean;
  timingMode?: string;
}

export interface AttendanceLeaveRequest {
  leaveRequestID: number;
  orgID: number;
  userID: number;
  userName?: string | null;
  employeeCode?: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: string;
  reviewComment?: string | null;
}

export interface AttendanceMonthlyOffDayHeader {
  date: string;
  day: number;
  weekday: string;
  isSunday: boolean;
}

export interface AttendanceMonthlyOffDayCell {
  date: string;
  defaultOff: boolean;
  effectiveOff: boolean;
  override?: string | null;
}

export interface AttendanceMonthlyOffEmployeeRow {
  userID: number;
  name: string;
  employeeCode: string;
  days: AttendanceMonthlyOffDayCell[];
}

export interface AttendanceMonthlyOffPlan {
  year: number;
  month: number;
  monthLabel: string;
  dayHeaders: AttendanceMonthlyOffDayHeader[];
  employees: AttendanceMonthlyOffEmployeeRow[];
}

export type MonthlyOffOverride = 'default' | 'off' | 'working';

export interface AttendanceMonthlyOffChange {
  userID: number;
  date: string;
  override: MonthlyOffOverride;
}

export interface AttendancePayrollRow {
  employeeID: number;
  employeeName: string;
  employeeCode: string;
  monthlySalary: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  weeklyOffDays: number;
  payableSalary: number;
  salaryConfigured: boolean;
  monthLabel?: string;
}

export interface AttendanceStats {
  totalEmployees: number;
  todayAttendance: number;
  lateCheckIns: number;
  absentEmployees: number;
  leaveCount: number;
  weekOffCount: number;
  pendingConfirmations: number;
}

export interface ApiResponse<T> {
  success?: boolean;
  Success?: boolean;
  message?: string | null;
  Message?: string | null;
  data?: T | null;
  Data?: T | null;
}
