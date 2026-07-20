import {
  applyVoucherToBalance,
  bankVoucherBalanceSign,
  bankVoucherTitle,
  buildBankVoucherDetails,
  filterBankLedgerHeads,
  isBankVoucherType,
  validateBankVoucherForm
} from './bank-voucher.util';
import { CASH_PAYMENT_TYPE_ID, FyOption, LedgerHeadOption, VoucherFormState } from '../models/audit.model';

function validForm(): VoucherFormState {
  return {
    voucherID: null,
    orgID: 12,
    accountRegisterID: 3,
    vCode: 1,
    vDate: '2026-07-15',
    partyTID: null,
    remark: '',
    paymentTypeID: CASH_PAYMENT_TYPE_ID,
    transactionNo: '',
    transactionDate: '2026-07-15',
    depositDate: '2026-07-15',
    ledgerHeadBankID: null,
    bankName: '',
    filePath: '',
    fyID: 5,
    details: [
      {
        rowId: 1,
        srNo: 1,
        ledgerHeadId: 101,
        ledgerHeadNarration: 'Deposit to SBI',
        amount: 2500.5
      }
    ]
  };
}

const fyList: FyOption[] = [
  { fyID: 5, fyName: '2026-27', fromDate: '2026-04-01', toDate: '2027-03-31' }
];

describe('bank-voucher.util', () => {
  describe('isBankVoucherType', () => {
    it('accepts BD and BW (case-insensitive)', () => {
      expect(isBankVoucherType('BD')).toBe(true);
      expect(isBankVoucherType('bw')).toBe(true);
      expect(isBankVoucherType(' Bd ')).toBe(true);
    });

    it('rejects receipt/payment and empty', () => {
      expect(isBankVoucherType('R')).toBe(false);
      expect(isBankVoucherType('P')).toBe(false);
      expect(isBankVoucherType('')).toBe(false);
      expect(isBankVoucherType(null)).toBe(false);
    });
  });

  describe('bankVoucherBalanceSign / applyVoucherToBalance', () => {
    it('BD increases balance like receipt', () => {
      expect(bankVoucherBalanceSign('BD')).toBe(1);
      expect(applyVoucherToBalance(1000, 'BD', 250)).toBe(1250);
      expect(applyVoucherToBalance(1000, 'R', 250)).toBe(1250);
    });

    it('BW decreases balance like payment', () => {
      expect(bankVoucherBalanceSign('BW')).toBe(-1);
      expect(applyVoucherToBalance(1000, 'BW', 250)).toBe(750);
      expect(applyVoucherToBalance(1000, 'P', 250)).toBe(750);
    });

    it('unknown type does not change balance', () => {
      expect(bankVoucherBalanceSign('XX')).toBe(0);
      expect(applyVoucherToBalance(1000, 'XX', 250)).toBe(1000);
    });

    it('net of deposit then withdraw matches expected register balance', () => {
      let bal = 5000;
      bal = applyVoucherToBalance(bal, 'BD', 2000);
      bal = applyVoucherToBalance(bal, 'BW', 750);
      expect(bal).toBe(6250);
    });
  });

  describe('bankVoucherTitle', () => {
    it('returns display titles', () => {
      expect(bankVoucherTitle('BD')).toBe('Bank Deposit');
      expect(bankVoucherTitle('BW')).toBe('Bank Withdraw');
    });
  });

  describe('filterBankLedgerHeads', () => {
    const heads: LedgerHeadOption[] = [
      { ledgerHeadID: 1, ledgerHead: 'Fees', ledgerTypeID: 2 },
      { ledgerHeadID: 2, ledgerHead: 'SBI Bank', ledgerTypeID: 5 },
      { ledgerHeadID: 3, ledgerHead: 'HDFC Bank', ledgerTypeID: 7 },
      { ledgerHeadID: 4, ledgerHead: 'Salary', ledgerTypeID: 1 }
    ];

    it('prefers bankLedgerHeads from Bank view when provided', () => {
      const fromView: LedgerHeadOption[] = [{ ledgerHeadID: 99, ledgerHead: 'View Bank', ledgerTypeID: null }];
      expect(filterBankLedgerHeads(heads, fromView)).toEqual(fromView);
    });

    it('falls back to bank-type ledger heads (types 5-9) when bank view empty', () => {
      const result = filterBankLedgerHeads(heads, []);
      expect(result.map((h) => h.ledgerHeadID)).toEqual([2, 3]);
    });

    it('falls back to bankLedgerHeads when no typed bank heads exist', () => {
      const fallback: LedgerHeadOption[] = [{ ledgerHeadID: 99, ledgerHead: 'Fallback Bank', ledgerTypeID: null }];
      const result = filterBankLedgerHeads([{ ledgerHeadID: 1, ledgerHead: 'Fees', ledgerTypeID: 2 }], fallback);
      expect(result).toEqual(fallback);
    });

    it('returns empty when neither source has bank heads', () => {
      expect(filterBankLedgerHeads([], [])).toEqual([]);
      expect(filterBankLedgerHeads(null, null)).toEqual([]);
    });
  });

  describe('validateBankVoucherForm', () => {
    it('accepts a complete bank deposit/withdraw form', () => {
      const errors = validateBankVoucherForm(validForm(), { fyList });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('rejects missing organization', () => {
      const form = validForm();
      form.orgID = null;
      expect(validateBankVoucherForm(form, { fyList })['orgID']).toBe('Organization is required.');
    });

    it('rejects missing account register', () => {
      const form = validForm();
      form.accountRegisterID = null;
      expect(validateBankVoucherForm(form, { fyList })['accountRegisterID']).toBe(
        'Account Register is required.'
      );
    });

    it('rejects missing transaction date', () => {
      const form = validForm();
      form.vDate = '';
      expect(validateBankVoucherForm(form, { fyList })['vDate']).toBe('Transaction Date is required.');
    });

    it('rejects missing financial year', () => {
      const form = validForm();
      form.fyID = null;
      expect(validateBankVoucherForm(form, { fyList })['fyID']).toBe('Financial Year is required.');
    });

    it('rejects date before FY from-date', () => {
      const form = validForm();
      form.vDate = '2026-03-01';
      expect(validateBankVoucherForm(form, { fyList })['vDate']).toBe('Date must be within selected FY.');
    });

    it('rejects date after FY to-date', () => {
      const form = validForm();
      form.vDate = '2027-04-01';
      expect(validateBankVoucherForm(form, { fyList })['vDate']).toBe('Date must be within selected FY.');
    });

    it('rejects missing bank ledger head', () => {
      const form = validForm();
      form.details[0].ledgerHeadId = null;
      expect(validateBankVoucherForm(form, { fyList })['ledgerHeadId']).toBe('Ledger Head is required.');
    });

    it('accepts negative bank ledger head ids used in live data', () => {
      const form = validForm();
      form.details[0].ledgerHeadId = -2;
      expect(Object.keys(validateBankVoucherForm(form, { fyList })).length).toBe(0);
      expect(buildBankVoucherDetails(form)[0].ledgerHeadId).toBe(-2);
    });

    it('rejects zero or negative amount', () => {
      const form = validForm();
      form.details[0].amount = 0;
      expect(validateBankVoucherForm(form, { fyList })['amount']).toBe('Amount must be greater than 0.');

      form.details[0].amount = -10;
      expect(validateBankVoucherForm(form, { fyList })['amount']).toBe('Amount must be greater than 0.');
    });

    it('accepts date on FY boundaries', () => {
      const form = validForm();
      form.vDate = '2026-04-01';
      expect(Object.keys(validateBankVoucherForm(form, { fyList })).length).toBe(0);
      form.vDate = '2027-03-31';
      expect(Object.keys(validateBankVoucherForm(form, { fyList })).length).toBe(0);
    });
  });

  describe('buildBankVoucherDetails', () => {
    it('builds a single ACVoucherDetail line for save', () => {
      const details = buildBankVoucherDetails(validForm());
      expect(details).toEqual([
        {
          srNo: 1,
          ledgerHeadId: 101,
          ledgerHeadNarration: 'Deposit to SBI',
          amount: 2500.5
        }
      ]);
    });

    it('returns empty when ledger or amount invalid', () => {
      const form = validForm();
      form.details[0].ledgerHeadId = null;
      expect(buildBankVoucherDetails(form)).toEqual([]);

      form.details[0].ledgerHeadId = 101;
      form.details[0].amount = 0;
      expect(buildBankVoucherDetails(form)).toEqual([]);
    });

    it('trims narration and maps blank to null', () => {
      const form = validForm();
      form.details[0].ledgerHeadNarration = '  ';
      expect(buildBankVoucherDetails(form)[0].ledgerHeadNarration).toBeNull();
    });
  });
});
