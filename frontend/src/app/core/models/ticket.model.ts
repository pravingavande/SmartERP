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

export interface TicketModuleOption {
  ticketModuleID: number;
  moduleName: string;
  sortOrder: number;
}

export interface TicketLookups {
  orgs: OrgOption[];
  statuses: TicketStatusOption[];
  modules: TicketModuleOption[];
  priorities: string[];
  replyRequiredOptions: string[];
  isSansthaUser: boolean;
  canRaiseTicket: boolean;
  userID: number;
}

export interface TicketFormState {
  ticketID: number | null;
  orgIDs: number[];
  ticketDate: string;
  subject: string;
  description: string;
  module: string;
  priority: string;
  replyRequired: string;
  attachment: string;
}

export interface TicketListItem {
  ticketID: number;
  ticketNo?: string | null;
  orgID: number;
  ticketDate: string;
  subject?: string | null;
  description?: string | null;
  module?: string | null;
  priority?: string | null;
  replyRequired?: string | null;
  ticketStatusID: number;
  attachment?: string | null;
  userID: number;
  createdDate: string;
  modifyDate?: string | null;
  submittedDate?: string | null;
  sentDate?: string | null;
  readDate?: string | null;
  lastReplyDate?: string | null;
  closedDate?: string | null;
  closedByUserID?: number | null;
  ip?: string | null;
  organizationName?: string | null;
  schoolNames?: string | null;
  orgIDs?: string | null;
  statusName?: string | null;
  statusNameMr?: string | null;
  userCode?: string | null;
}

export interface TicketReply {
  replyID: number;
  ticketID: number;
  replyText: string;
  replyStatus?: string | null;
  userID: number;
  replyDate: string;
  attachment?: string | null;
  userCode?: string | null;
}

export interface TicketDetail {
  ticket: TicketListItem;
  replies: TicketReply[];
  canEdit: boolean;
  canReply: boolean;
  canClose: boolean;
}

export interface TicketPendingNotification {
  ticketID: number;
  ticketNo?: string | null;
  subject?: string | null;
  description?: string | null;
  module?: string | null;
  priority?: string | null;
  replyRequired?: string | null;
  ticketStatusID: number;
  createdByUserID: number;
  submittedDate?: string | null;
  sentDate?: string | null;
  statusName?: string | null;
  statusNameMr?: string | null;
  schoolNames?: string | null;
}

export interface TicketNotificationPayload {
  ticketID: number;
  ticketNo?: string | null;
  subject?: string | null;
  replyRequired?: string | null;
  schoolNames?: string | null;
  orgIDs: number[];
}

export interface ReplyFormState {
  replyText: string;
  replyStatus: string;
  attachment: string;
}
