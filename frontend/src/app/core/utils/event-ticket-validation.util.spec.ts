import {
  mapEventTicketBackendMessage,
  validateEventForm,
  validateEventTypeForm,
  validateTicketForm,
  validateTicketReply
} from './event-ticket-validation.util';

describe('event-ticket-validation.util', () => {
  describe('validateTicketForm', () => {
    it('rejects empty schools', () => {
      const errors = validateTicketForm({ orgIDs: [], subject: 'Help', replyRequired: 'Instant' });
      expect(errors['orgIDs']).toBe('Select at least one school.');
    });

    it('rejects blank subject', () => {
      const errors = validateTicketForm({ orgIDs: [1], subject: '   ', replyRequired: 'Instant' });
      expect(errors['subject']).toBe('Subject is required.');
    });

    it('rejects missing reply required', () => {
      const errors = validateTicketForm({ orgIDs: [1], subject: 'Printer issue', replyRequired: '' });
      expect(errors['replyRequired']).toBe('Reply Required is required.');
    });

    it('accepts valid ticket form', () => {
      const errors = validateTicketForm({ orgIDs: [1, 2], subject: 'Network down', replyRequired: 'Later' });
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('validateEventForm', () => {
    it('rejects missing title', () => {
      const errors = validateEventForm({ title: '', location: 'Hall', orgIDs: [1] });
      expect(errors['title']).toBe('Title is required.');
    });

    it('rejects missing location', () => {
      const errors = validateEventForm({ title: 'Sports Day', location: '  ', orgIDs: [1] });
      expect(errors['location']).toBe('Location is required.');
    });

    it('rejects missing schools', () => {
      const errors = validateEventForm({ title: 'Sports Day', location: 'Ground', orgIDs: [] });
      expect(errors['orgIDs']).toBe('Select at least one school.');
    });

    it('accepts valid event form', () => {
      const errors = validateEventForm({ title: 'Annual Day', location: 'Auditorium', orgIDs: [3] });
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('validateEventTypeForm', () => {
    it('rejects missing organization', () => {
      const errors = validateEventTypeForm({ underOrgID: 0, eventType: 'Meeting' });
      expect(errors['underOrgID']).toBe('Organization is required.');
    });

    it('rejects blank event type', () => {
      const errors = validateEventTypeForm({ underOrgID: 1, eventType: '   ' });
      expect(errors['eventType']).toBe('Event Type is required.');
    });

    it('matches EventTypes table required columns', () => {
      const valid = validateEventTypeForm({ underOrgID: 5, eventType: 'Parent Meeting' });
      expect(Object.keys(valid).length).toBe(0);
    });

    it('rejects all invalid master combinations', () => {
      const cases = [
        { underOrgID: 0, eventType: 'X' },
        { underOrgID: 1, eventType: '' },
        { underOrgID: 0, eventType: '' }
      ];
      for (const c of cases) {
        const errors = validateEventTypeForm(c);
        expect(Object.keys(errors).length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateTicketReply', () => {
    it('requires reply text', () => {
      expect(validateTicketReply('')).toBe('Reply is required.');
      expect(validateTicketReply('Working on it')).toBeNull();
    });
  });

  describe('mapEventTicketBackendMessage', () => {
    it('maps school validation to orgIDs field', () => {
      const errors = mapEventTicketBackendMessage('At least one school is required.');
      expect(errors['orgIDs']).toBe('At least one school is required.');
    });

    it('maps title validation', () => {
      const errors = mapEventTicketBackendMessage('Title is required.');
      expect(errors['title']).toBe('Title is required.');
    });

    it('maps event type validation', () => {
      const errors = mapEventTicketBackendMessage('Event Type is required.');
      expect(errors['eventType']).toBe('Event Type is required.');
    });

    it('maps organization validation', () => {
      const errors = mapEventTicketBackendMessage('Organization is required.');
      expect(errors['underOrgID']).toBe('Organization is required.');
    });
  });
});
