import {
  mapEventTicketBackendMessage,
  validateEventForm,
  validateEventTypeForm,
  validateTicketForm,
  validateTicketReply
} from './event-ticket-validation.util';

describe('event-ticket-validation.util', () => {
  describe('validateTicketForm (Ticket Entry)', () => {
    const invalidTicketCases: Array<{ orgIDs: number[]; subject: string; replyRequired: string; expectedKey: string }> = [
      { orgIDs: [], subject: 'Help', replyRequired: 'Instant', expectedKey: 'orgIDs' },
      { orgIDs: [1], subject: '   ', replyRequired: 'Instant', expectedKey: 'subject' },
      { orgIDs: [1], subject: '', replyRequired: 'Instant', expectedKey: 'subject' },
      { orgIDs: [1], subject: 'Printer issue', replyRequired: '', expectedKey: 'replyRequired' },
      { orgIDs: [1], subject: 'Printer issue', replyRequired: '   ', expectedKey: 'replyRequired' }
    ];

    for (const c of invalidTicketCases) {
      it(`rejects ticket when ${c.expectedKey} is invalid`, () => {
        const errors = validateTicketForm(c);
        expect(errors[c.expectedKey]).toBeTruthy();
      });
    }

    const validTicketCases = [
      { orgIDs: [1], subject: 'Printer issue', replyRequired: 'Instant' },
      { orgIDs: [1, 2, 3], subject: 'Network down', replyRequired: 'Later' },
      { orgIDs: [99], subject: '  Lab AC not working  ', replyRequired: 'Instant' }
    ];

    for (const c of validTicketCases) {
      it(`accepts valid ticket form for schools [${c.orgIDs.join(',')}]`, () => {
        const errors = validateTicketForm(c);
        expect(Object.keys(errors).length).toBe(0);
      });
    }
  });

  describe('validateEventForm (Add Event)', () => {
    const invalidEventCases: Array<{ title: string; location: string; orgIDs: number[]; expectedKey: string }> = [
      { title: '', location: 'Hall', orgIDs: [1], expectedKey: 'title' },
      { title: '   ', location: 'Hall', orgIDs: [1], expectedKey: 'title' },
      { title: 'Sports Day', location: '  ', orgIDs: [1], expectedKey: 'location' },
      { title: 'Sports Day', location: '', orgIDs: [1], expectedKey: 'location' },
      { title: 'Sports Day', location: 'Ground', orgIDs: [], expectedKey: 'orgIDs' }
    ];

    for (const c of invalidEventCases) {
      it(`rejects event when ${c.expectedKey} is invalid`, () => {
        const errors = validateEventForm(c);
        expect(errors[c.expectedKey]).toBeTruthy();
      });
    }

    const validEventCases = [
      { title: 'Annual Day', location: 'Auditorium', orgIDs: [3] },
      { title: 'Parent Meeting', location: 'Conference Room', orgIDs: [1, 2] },
      { title: '  Sports Day  ', location: '  Ground  ', orgIDs: [5, 6, 7] }
    ];

    for (const c of validEventCases) {
      it(`accepts valid event for ${c.orgIDs.length} school(s)`, () => {
        const errors = validateEventForm(c);
        expect(Object.keys(errors).length).toBe(0);
      });
    }
  });

  describe('validateEventTypeForm (Event Types Master)', () => {
    const invalidMasterCases: Array<{ underOrgID: number; eventType: string; expectedKey: string }> = [
      { underOrgID: 0, eventType: 'Meeting', expectedKey: 'underOrgID' },
      { underOrgID: -1, eventType: 'Meeting', expectedKey: 'underOrgID' },
      { underOrgID: 1, eventType: '', expectedKey: 'eventType' },
      { underOrgID: 1, eventType: '   ', expectedKey: 'eventType' },
      { underOrgID: 0, eventType: '', expectedKey: 'underOrgID' }
    ];

    for (const c of invalidMasterCases) {
      it(`rejects event type master when ${c.expectedKey} is invalid`, () => {
        const errors = validateEventTypeForm(c);
        expect(errors[c.expectedKey]).toBeTruthy();
      });
    }

    const validMasterCases = [
      { underOrgID: 5, eventType: 'Parent Meeting' },
      { underOrgID: 1, eventType: 'Annual Day' },
      { underOrgID: 12, eventType: '  Workshop  ' }
    ];

    for (const c of validMasterCases) {
      it(`accepts valid event type "${c.eventType.trim()}" for org ${c.underOrgID}`, () => {
        const errors = validateEventTypeForm(c);
        expect(Object.keys(errors).length).toBe(0);
      });
    }
  });

  describe('validateTicketReply', () => {
    it('requires reply text', () => {
      expect(validateTicketReply('')).toBe('Reply is required.');
      expect(validateTicketReply('   ')).toBe('Reply is required.');
      expect(validateTicketReply('Working on it')).toBeNull();
    });
  });

  describe('mapEventTicketBackendMessage', () => {
    const backendMessages: Array<{ message: string; field: string }> = [
      { message: 'At least one school is required.', field: 'orgIDs' },
      { message: 'Title is required.', field: 'title' },
      { message: 'Location is required.', field: 'location' },
      { message: 'Subject is required.', field: 'subject' },
      { message: 'Reply Required is required.', field: 'replyRequired' },
      { message: 'Event Type is required.', field: 'eventType' },
      { message: 'Organization is required.', field: 'underOrgID' }
    ];

    for (const c of backendMessages) {
      it(`maps "${c.message}" to ${c.field}`, () => {
        const errors = mapEventTicketBackendMessage(c.message);
        expect(errors[c.field]).toBe(c.message);
      });
    }

    it('returns empty object for unknown message', () => {
      expect(mapEventTicketBackendMessage('Unexpected server error')).toEqual({});
      expect(mapEventTicketBackendMessage(null)).toEqual({});
    });
  });
});
