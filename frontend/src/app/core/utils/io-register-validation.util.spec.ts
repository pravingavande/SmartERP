import {
  IO_ALLOWED_FILE_EXT,
  IO_MAX_FILE_BYTES,
  mapIoBackendMessageToFieldErrors,
  validateInwardForm,
  validateOutwardForm
} from './io-register-validation.util';
import { InwardFormState, OutwardFormState } from '../models/io-register.model';

function validInwardForm(): InwardFormState {
  return {
    irid: null,
    orgID: 1,
    recordNo: 3,
    irDate: '2026-03-15',
    fileNo: 'F-101',
    letterNo: 'L-55',
    fromWhomReceived: 'Education Department',
    subject: 'Annual inspection letter',
    toWhomIssued: 'Principal',
    remark: 'Urgent',
    attachmentPath: '',
    yioID: 1,
    yearName: '2026'
  };
}

function validOutwardForm(): OutwardFormState {
  return {
    orid: null,
    orgID: 1,
    recordNo: 2,
    orDate: '2026-03-16',
    enclosures: 'Copy of report',
    address: 'Block Education Officer, Pune',
    subject: 'Reply to inspection notice',
    fileNo: 'OF-22',
    orrDate: '2026-03-18',
    expensesAmt: 45.5,
    remark: 'Registered post',
    attachmentPath: '',
    yioID: 1,
    yearName: '2026'
  };
}

describe('io-register-validation.util', () => {
  describe('validateInwardForm', () => {
    it('accepts a complete inward form', () => {
      const errors = validateInwardForm(validInwardForm());
      expect(Object.keys(errors).length).toBe(0);
    });

    it('rejects missing organization', () => {
      const form = validInwardForm();
      form.orgID = null;
      const errors = validateInwardForm(form);
      expect(errors['orgID']).toBe('Organization is required.');
    });

    it('rejects blank inward date', () => {
      const form = validInwardForm();
      form.irDate = '   ';
      const errors = validateInwardForm(form);
      expect(errors['irDate']).toBe('Inward date is required.');
    });

    it('rejects blank from whom received', () => {
      const form = validInwardForm();
      form.fromWhomReceived = '';
      const errors = validateInwardForm(form);
      expect(errors['fromWhomReceived']).toBe('From whom received is required.');
    });

    it('rejects blank subject', () => {
      const form = validInwardForm();
      form.subject = '  ';
      const errors = validateInwardForm(form);
      expect(errors['subject']).toBe('Subject is required.');
    });

    it('collects all inward mandatory field errors', () => {
      const errors = validateInwardForm({
        irid: null,
        orgID: null,
        recordNo: null,
        irDate: '',
        fileNo: '',
        letterNo: '',
        fromWhomReceived: '',
        subject: '',
        toWhomIssued: '',
        remark: '',
        attachmentPath: '',
        yioID: null,
        yearName: null
      });
      expect(errors['orgID']).toBeDefined();
      expect(errors['irDate']).toBeDefined();
      expect(errors['fromWhomReceived']).toBeDefined();
      expect(errors['subject']).toBeDefined();
    });

    it('allows optional attachment on inward form', () => {
      const form = validInwardForm();
      form.attachmentPath = '';
      const errors = validateInwardForm(form);
      expect(errors['attachmentPath']).toBeUndefined();
    });

    it('accepts edit inward form with existing id', () => {
      const form = validInwardForm();
      form.irid = 42;
      const errors = validateInwardForm(form);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('rejects edit inward form when mandatory fields cleared', () => {
      const form = validInwardForm();
      form.irid = 42;
      form.subject = '';
      form.fromWhomReceived = '';
      const errors = validateInwardForm(form);
      expect(errors['subject']).toBe('Subject is required.');
      expect(errors['fromWhomReceived']).toBe('From whom received is required.');
    });
  });

  describe('validateOutwardForm', () => {
    it('accepts a complete outward form', () => {
      const errors = validateOutwardForm(validOutwardForm());
      expect(Object.keys(errors).length).toBe(0);
    });

    it('rejects missing organization', () => {
      const form = validOutwardForm();
      form.orgID = null;
      const errors = validateOutwardForm(form);
      expect(errors['orgID']).toBe('Organization is required.');
    });

    it('rejects blank outward date', () => {
      const form = validOutwardForm();
      form.orDate = '';
      const errors = validateOutwardForm(form);
      expect(errors['orDate']).toBe('Outward date is required.');
    });

    it('rejects blank address', () => {
      const form = validOutwardForm();
      form.address = '  ';
      const errors = validateOutwardForm(form);
      expect(errors['address']).toBe('Address is required.');
    });

    it('rejects blank subject', () => {
      const form = validOutwardForm();
      form.subject = '';
      const errors = validateOutwardForm(form);
      expect(errors['subject']).toBe('Subject is required.');
    });

    it('rejects negative expenses amount', () => {
      const form = validOutwardForm();
      form.expensesAmt = -10;
      const errors = validateOutwardForm(form);
      expect(errors['expensesAmt']).toBe('Expenses amount must be greater than or equal to zero.');
    });

    it('allows zero expenses amount', () => {
      const form = validOutwardForm();
      form.expensesAmt = 0;
      const errors = validateOutwardForm(form);
      expect(errors['expensesAmt']).toBeUndefined();
    });

    it('treats null expenses as zero', () => {
      const form = validOutwardForm();
      form.expensesAmt = null;
      const errors = validateOutwardForm(form);
      expect(errors['expensesAmt']).toBeUndefined();
    });

    it('accepts edit outward form with existing id', () => {
      const form = validOutwardForm();
      form.orid = 55;
      const errors = validateOutwardForm(form);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('rejects edit outward form when address cleared', () => {
      const form = validOutwardForm();
      form.orid = 55;
      form.address = '';
      const errors = validateOutwardForm(form);
      expect(errors['address']).toBe('Address is required.');
    });

    it('allows optional attachment on outward edit', () => {
      const form = validOutwardForm();
      form.orid = 55;
      form.attachmentPath = '';
      const errors = validateOutwardForm(form);
      expect(errors['attachmentPath']).toBeUndefined();
    });
  });

  describe('mapIoBackendMessageToFieldErrors', () => {
    it('maps organization error', () => {
      const errors = mapIoBackendMessageToFieldErrors('Organization is required.');
      expect(errors['orgID']).toBe('Organization is required.');
    });

    it('maps inward date error', () => {
      const errors = mapIoBackendMessageToFieldErrors('Inward date is required.');
      expect(errors['irDate']).toBe('Inward date is required.');
    });

    it('maps outward date error', () => {
      const errors = mapIoBackendMessageToFieldErrors('Outward date is required.');
      expect(errors['orDate']).toBe('Outward date is required.');
    });

    it('maps from whom received error', () => {
      const errors = mapIoBackendMessageToFieldErrors('From whom received is required.');
      expect(errors['fromWhomReceived']).toBe('From whom received is required.');
    });

    it('maps address error', () => {
      const errors = mapIoBackendMessageToFieldErrors('Address is required.');
      expect(errors['address']).toBe('Address is required.');
    });

    it('maps subject error', () => {
      const errors = mapIoBackendMessageToFieldErrors('Subject is required.');
      expect(errors['subject']).toBe('Subject is required.');
    });

    it('maps expenses error', () => {
      const errors = mapIoBackendMessageToFieldErrors('Expenses amount must be greater than or equal to zero.');
      expect(errors['expensesAmt']).toBe('Expenses amount must be greater than or equal to zero.');
    });

    it('returns empty object for blank message', () => {
      expect(mapIoBackendMessageToFieldErrors(null)).toEqual({});
      expect(mapIoBackendMessageToFieldErrors('')).toEqual({});
    });
  });

  describe('file upload constants', () => {
    it('allows required attachment extensions', () => {
      for (const ext of ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']) {
        expect(IO_ALLOWED_FILE_EXT.has(ext)).toBe(true);
      }
    });

    it('rejects unsupported attachment extensions', () => {
      expect(IO_ALLOWED_FILE_EXT.has('exe')).toBe(false);
      expect(IO_ALLOWED_FILE_EXT.has('zip')).toBe(false);
    });

    it('enforces 10 MB max file size', () => {
      expect(IO_MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
    });
  });
});
