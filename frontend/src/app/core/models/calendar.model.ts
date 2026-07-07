export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Holiday {
  holidayId: number;
  holidayDate: string;
  nameMr: string;
  nameEn: string;
  holidayType: string;
  color: string;
  year: number;
}

export interface Festival {
  festivalId: number;
  festivalDate: string;
  nameMr: string;
  nameEn: string;
  color: string;
  year: number;
}

export interface AcademicCalendarData {
  holidays: Holiday[];
  festivals: Festival[];
}

export interface SaveHolidayRequest {
  holidayId?: number | null;
  holidayDate: string;
  nameMr: string;
  nameEn: string;
  holidayType: string;
  color: string;
  year: number;
}

export interface SaveFestivalRequest {
  festivalId?: number | null;
  festivalDate: string;
  nameMr: string;
  nameEn: string;
  color: string;
  year: number;
}

export interface EventType {
  eventTypeId: number;
  code: string;
  nameEn: string;
  nameMr: string;
  defaultColor?: string | null;
  sortOrder: number;
}

export interface CalendarEvent {
  eventId: number;
  title: string;
  description?: string | null;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay: boolean;
  eventTypeId?: number | null;
  eventTypeNameMr?: string | null;
  eventTypeNameEn?: string | null;
  eventTypeColor?: string | null;
  priority: string;
  location?: string | null;
  organizerUserId?: number | null;
  organizerName?: string | null;
  color?: string | null;
  status: string;
  notes?: string | null;
}

export interface SaveEventRequest {
  eventId?: number | null;
  title: string;
  description?: string | null;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay: boolean;
  eventTypeId?: number | null;
  priority: string;
  location?: string | null;
  organizerUserId?: number | null;
  organizerName?: string | null;
  color?: string | null;
  status: string;
  notes?: string | null;
}

export interface CalendarDay {
  date: Date;
  inMonth: boolean;
  iso: string;
}
