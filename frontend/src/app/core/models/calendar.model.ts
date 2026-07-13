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
  eventTypeID: number;
  underOrgID: number;
  srNo: number;
  eventType: string;
  isActive: boolean;
  underOrgName?: string | null;
}

export interface SaveEventTypeRequest {
  eventTypeID?: number | null;
  underOrgID: number;
  eventType: string;
  isActive: boolean;
}

export interface LocationOption {
  locationID: number;
  underOrgID: number;
  locationName: string;
  isActive: boolean;
}

export interface EventLookups {
  eventTypes: EventType[];
  orgs: { orgID: number; organizationName: string; schoolCode?: number | null; underOrgID?: number | null }[];
  sansthaOrgs: number[];
  canManageEvents: boolean;
  isSansthaUser: boolean;
}

export interface CalendarEvent {
  eventID: number;
  title: string;
  description?: string | null;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay: boolean;
  eventTypeID?: number | null;
  eventTypeName?: string | null;
  locationID?: number | null;
  location?: string | null;
  color?: string | null;
  status: string;
  notes?: string | null;
  underOrgID?: number | null;
  schoolNames?: string | null;
  orgIDs?: string | null;
  eventReporting?: string | null;
  eventPhotoAttachment?: string | null;
  eventNewsAttachment?: string | null;
  isLocked: boolean;
  canEdit: boolean;
  canManage: boolean;
  canEditReporting: boolean;
}

export interface SaveEventRequest {
  eventID?: number | null;
  title: string;
  description?: string | null;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay: boolean;
  eventTypeID?: number | null;
  locationID?: number | null;
  location?: string | null;
  color?: string | null;
  status: string;
  notes?: string | null;
  underOrgID?: number | null;
  orgIDs: number[];
  eventReporting?: string | null;
  eventPhotoAttachment?: string | null;
  eventNewsAttachment?: string | null;
}

export interface PendingEventReporting {
  eventID: number;
  title: string;
  eventDate: string;
  status: string;
  schoolNames?: string | null;
  eventReporting?: string | null;
}

export interface PendingEventReportingSummary {
  pendingCount: number;
  items: PendingEventReporting[];
}

export interface CalendarDay {
  date: Date;
  inMonth: boolean;
  iso: string;
}
