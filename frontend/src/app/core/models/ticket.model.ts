export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface OrgOption {
  orgID: number;
  organizationName: string;
  shortName?: string | null;
  schoolCode?: number | null;
}

export interface TicketStatusOption {
  ticketStatusID: number;
  statusName: string;
  statusNameMr: string;
  sortOrder: number;
}

export interface TicketLookups {
  orgs: OrgOption[];
  statuses: TicketStatusOption[];
  isSansthaUser: boolean;
}

export interface TicketFormState {
  ticketID: number | null;
  orgID: number | null;
  ticketDate: string;
  description: string;
  amount: number;
  ticketStatusID: number | null;
  attachment: string;
}

export interface TicketListItem {
  ticketID: number;
  orgID: number;
  ticketDate: string;
  description?: string | null;
  amount: number;
  ticketStatusID: number;
  attachment?: string | null;
  userID: number;
  createdDate: string;
  modifyDate?: string | null;
  ip?: string | null;
  organizationName?: string | null;
  statusName?: string | null;
  statusNameMr?: string | null;
  userCode?: string | null;
}

export type Ticket = TicketListItem;
