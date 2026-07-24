import {
  mapBackendMessageToFieldErrors,
  trimText,
  validateClassForm,
  validateDocumentUploadForm,
  validateItemForm,
  validateLedgerHeadForm,
  validateLeaveTypeForm,
  validateOrgSelection,
  validatePartyForm,
  validateStockForm,
  validateSubjectForm
} from './master-validation.util';
import { DocumentUploadFormState } from '../models/document-upload.model';

function validDocumentUploadForm(): DocumentUploadFormState {
  return {
    documentUploadID: null,
    orgID: 4,
    srNo: 1,
    tDate: '2026-03-15',
    documentTitle: 'Annual Report',
    documentPath: 'Documents/4/report.pdf'
  };
}

describe('master-validation.util', () => {
  it('trimText removes surrounding whitespace', () => {
    expect(trimText('  Maths  ')).toBe('Maths');
  });

  it('validateSubjectForm rejects blank subject name', () => {
    const errors = validateSubjectForm({ subjectID: null, underOrgID: 1, subjectName: '   ', isActive: true });
    expect(errors['subjectName']).toBe('Subject name is required.');
  });

  it('validateSubjectForm rejects missing organization', () => {
    const errors = validateSubjectForm({ subjectID: null, underOrgID: null, subjectName: 'Maths', isActive: true });
    expect(errors['underOrgID']).toBe('Organization is required.');
  });

  it('validateClassForm accepts valid class name', () => {
    const errors = validateClassForm({ classID: null, orgID: 1, srNo: 1, className: 'Grade 5', isActive: true });
    expect(Object.keys(errors).length).toBe(0);
  });

  it('validatePartyForm rejects missing school and name', () => {
    const errors = validatePartyForm({ orgID: null, partyName: '  ' });
    expect(errors['orgID']).toBe('School is required.');
    expect(errors['partyName']).toBe('Party name is required.');
  });

  it('validateLedgerHeadForm rejects missing fields', () => {
    const errors = validateLedgerHeadForm({ underOrgID: null, ledgerHead: '', ledgerTypeID: null, description: '' });
    expect(errors['underOrgID']).toBe('Organization is required.');
    expect(errors['ledgerHead']).toBe('Ledger head is required.');
    expect(errors['ledgerTypeID']).toBe('Ledger type is required.');
  });

  it('validateLedgerHeadForm accepts valid payload with description', () => {
    const errors = validateLedgerHeadForm({
      underOrgID: 4,
      ledgerHead: 'Fees',
      ledgerTypeID: 2,
      description: 'School fees head'
    });
    expect(Object.keys(errors).length).toBe(0);
  });

  it('validateLedgerHeadForm rejects overly long description', () => {
    const errors = validateLedgerHeadForm({
      underOrgID: 4,
      ledgerHead: 'Fees',
      ledgerTypeID: 2,
      description: 'x'.repeat(2001)
    });
    expect(errors['description']).toBe('Description must be 2000 characters or fewer.');
  });

  it('validateLeaveTypeForm rejects blank name', () => {
    const errors = validateLeaveTypeForm({
      leaveTypeID: null,
      underOrgID: 1,
      srNo: 1,
      leaveTypeName: '   ',
      isActive: true
    });
    expect(errors['leaveTypeName']).toBe('Leave type name is required.');
  });

  it('validateOrgSelection rejects missing org', () => {
    const errors = validateOrgSelection(null);
    expect(errors['orgID']).toBe('School is required.');
  });

  it('validateItemForm rejects negative rate', () => {
    const errors = validateItemForm({
      itemID: null,
      orgID: 1,
      itemGroupID: 2,
      itemName: 'Pen',
      rate: -1,
      isActive: true
    });
    expect(errors['rate']).toBe('Rate must be greater than or equal to zero.');
  });

  it('validateStockForm rejects zero quantity', () => {
    const errors = validateStockForm({
      stockID: null,
      orgID: 1,
      itemID: 2,
      qty: 0,
      rate: 10,
      amount: null,
      remark: ''
    });
    expect(errors['qty']).toBe('Quantity must be greater than zero.');
  });

  it('mapBackendMessageToFieldErrors maps subject error', () => {
    const errors = mapBackendMessageToFieldErrors('Subject name is required.');
    expect(errors['subjectName']).toBe('Subject name is required.');
  });

  it('mapBackendMessageToFieldErrors maps party and ledger fields', () => {
    expect(mapBackendMessageToFieldErrors('Party name is required.')['partyName']).toBe('Party name is required.');
    expect(mapBackendMessageToFieldErrors('Ledger type is required.')['ledgerTypeID']).toBe('Ledger type is required.');
    expect(mapBackendMessageToFieldErrors('Leave type name is required.')['leaveTypeName']).toBe('Leave type name is required.');
  });

  describe('validateDocumentUploadForm', () => {
    it('accepts a valid new document form', () => {
      const errors = validateDocumentUploadForm(validDocumentUploadForm(), false);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('rejects missing organization on add', () => {
      const form = validDocumentUploadForm();
      form.orgID = null;
      const errors = validateDocumentUploadForm(form, false);
      expect(errors['orgID']).toBe('Organization is required.');
    });

    it('rejects missing sr no on add', () => {
      const form = validDocumentUploadForm();
      form.srNo = null;
      const errors = validateDocumentUploadForm(form, false);
      expect(errors['srNo']).toBe('Sr No is required and must be a positive whole number.');
    });

    it('rejects non-integer sr no', () => {
      const form = validDocumentUploadForm();
      form.srNo = 1.5;
      const errors = validateDocumentUploadForm(form, false);
      expect(errors['srNo']).toBe('Sr No is required and must be a positive whole number.');
    });

    it('rejects blank document title on add', () => {
      const form = validDocumentUploadForm();
      form.documentTitle = '   ';
      const errors = validateDocumentUploadForm(form, false);
      expect(errors['documentTitle']).toBe('Document title is required.');
    });

    it('rejects missing date on add', () => {
      const form = validDocumentUploadForm();
      form.tDate = '';
      const errors = validateDocumentUploadForm(form, false);
      expect(errors['tDate']).toBe('Date is required.');
    });

    it('requires document file on add', () => {
      const form = validDocumentUploadForm();
      form.documentPath = '';
      const errors = validateDocumentUploadForm(form, false);
      expect(errors['documentPath']).toBe('Document file is required.');
    });

    it('allows missing document file on edit', () => {
      const form = validDocumentUploadForm();
      form.documentUploadID = 12;
      form.documentPath = '';
      const errors = validateDocumentUploadForm(form, true);
      expect(errors['documentPath']).toBeUndefined();
    });

    it('accepts valid edit form without re-uploading file', () => {
      const form = validDocumentUploadForm();
      form.documentUploadID = 12;
      form.documentPath = 'Documents/4/existing.pdf';
      const errors = validateDocumentUploadForm(form, true);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('collects all mandatory field errors on add', () => {
      const errors = validateDocumentUploadForm(
        {
          documentUploadID: null,
          orgID: null,
          srNo: null,
          tDate: '',
          documentTitle: '',
          documentPath: ''
        },
        false
      );
      expect(errors['orgID']).toBeDefined();
      expect(errors['srNo']).toBeDefined();
      expect(errors['documentTitle']).toBeDefined();
      expect(errors['tDate']).toBeDefined();
      expect(errors['documentPath']).toBeDefined();
    });
  });

  it('mapBackendMessageToFieldErrors maps document upload fields', () => {
    expect(mapBackendMessageToFieldErrors('Document title is required.')['documentTitle']).toBe('Document title is required.');
    expect(mapBackendMessageToFieldErrors('Document file is required.')['documentPath']).toBe('Document file is required.');
    expect(mapBackendMessageToFieldErrors('Date is required.')['tDate']).toBe('Date is required.');
    expect(mapBackendMessageToFieldErrors('Sr No already exists for this organization.')['srNo']).toBe(
      'Sr No already exists for this organization.'
    );
  });
});

