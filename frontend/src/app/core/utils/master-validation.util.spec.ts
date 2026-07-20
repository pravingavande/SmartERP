import {
  mapBackendMessageToFieldErrors,
  trimText,
  validateClassForm,
  validateItemForm,
  validateLedgerHeadForm,
  validateLeaveTypeForm,
  validateOrgSelection,
  validatePartyForm,
  validateStockForm,
  validateSubjectForm
} from './master-validation.util';

describe('master-validation.util', () => {
  it('trimText removes surrounding whitespace', () => {
    expect(trimText('  Maths  ')).toBe('Maths');
  });

  it('validateSubjectForm rejects blank subject name', () => {
    const errors = validateSubjectForm({ subjectID: null, subjectName: '   ', isActive: true });
    expect(errors['subjectName']).toBe('Subject name is required.');
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
    const errors = validateLeaveTypeForm({ leaveTypeName: '   ' });
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
});

