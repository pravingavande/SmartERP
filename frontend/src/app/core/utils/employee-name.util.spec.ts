import { buildEmployeeName, normalizeEmployeeShortName } from './employee-name.util';

describe('employee-name.util', () => {
  describe('buildEmployeeName', () => {
    it('joins first, middle and last name with spaces', () => {
      expect(buildEmployeeName('Ramesh', 'Kumar', 'Patil')).toBe('Ramesh Kumar Patil');
    });

    it('omits blank middle name', () => {
      expect(buildEmployeeName('Ramesh', '', 'Patil')).toBe('Ramesh Patil');
      expect(buildEmployeeName('Ramesh', '   ', 'Patil')).toBe('Ramesh Patil');
    });

    it('omits blank last name', () => {
      expect(buildEmployeeName('Ramesh', 'Kumar', '')).toBe('Ramesh Kumar');
    });

    it('returns first name only when middle and last are empty', () => {
      expect(buildEmployeeName('Ramesh', '', '')).toBe('Ramesh');
    });

    it('returns empty string when all parts are blank', () => {
      expect(buildEmployeeName('', '', '')).toBe('');
      expect(buildEmployeeName('  ', null, undefined)).toBe('');
    });

    it('trims whitespace from each part', () => {
      expect(buildEmployeeName('  Ramesh  ', ' Kumar ', ' Patil ')).toBe('Ramesh Kumar Patil');
    });

    it('handles middle name only with first', () => {
      expect(buildEmployeeName('Ramesh', 'K', '')).toBe('Ramesh K');
    });
  });

  describe('normalizeEmployeeShortName', () => {
    it('trims surrounding whitespace', () => {
      expect(normalizeEmployeeShortName('  R.P.  ')).toBe('R.P.');
    });

    it('returns empty string for null or undefined', () => {
      expect(normalizeEmployeeShortName(null)).toBe('');
      expect(normalizeEmployeeShortName(undefined)).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(normalizeEmployeeShortName('   ')).toBe('');
    });
  });
});
