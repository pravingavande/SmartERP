import { FieldErrors } from './form-field-errors';
import { SaveEventTypeRequest } from '../models/calendar.model';
import { TicketFormState } from '../models/ticket.model';

export function trimText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export interface EventFormValidationInput {
  title: string;
  location: string;
  orgIDs: number[];
}

export function validateTicketForm(form: Pick<TicketFormState, 'orgIDs' | 'subject' | 'replyRequired'>): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.orgIDs?.length) errors['orgIDs'] = 'Select at least one school.';
  if (!trimText(form.subject)) errors['subject'] = 'Subject is required.';
  if (!trimText(form.replyRequired)) errors['replyRequired'] = 'Reply Required is required.';
  return errors;
}

export function validateEventForm(form: EventFormValidationInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!trimText(form.title)) errors['title'] = 'Title is required.';
  if (!trimText(form.location)) errors['location'] = 'Location is required.';
  if (!form.orgIDs?.length) errors['orgIDs'] = 'Select at least one school.';
  return errors;
}

export function validateEventTypeForm(form: Pick<SaveEventTypeRequest, 'underOrgID' | 'eventType'>): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.underOrgID) errors['underOrgID'] = 'Organization is required.';
  if (!trimText(form.eventType)) errors['eventType'] = 'Event Type is required.';
  return errors;
}

export function validateTicketReply(replyText: string): string | null {
  return trimText(replyText) ? null : 'Reply is required.';
}

export function mapEventTicketBackendMessage(message: string | null | undefined): FieldErrors {
  const text = trimText(message);
  if (!text) return {};

  const lower = text.toLowerCase();
  if (lower.includes('title')) return { title: text };
  if (lower.includes('location')) return { location: text };
  if (lower.includes('school')) return { orgIDs: text };
  if (lower.includes('subject')) return { subject: text };
  if (lower.includes('reply required')) return { replyRequired: text };
  if (lower.includes('event type')) return { eventType: text };
  if (lower.includes('organization')) return { underOrgID: text };
  return {};
}
