import { matchesImportLanguage } from './import-language.util';

describe('import-language.util', () => {
  it('matches Marathi names with Devanagari script', () => {
    expect(matchesImportLanguage('गणित', 'M')).toBe(true);
    expect(matchesImportLanguage('गणित', 'E')).toBe(false);
  });

  it('matches English/Latin names', () => {
    expect(matchesImportLanguage('Open', 'E')).toBe(true);
    expect(matchesImportLanguage('Aadhar Card', 'E')).toBe(true);
    expect(matchesImportLanguage('Open', 'M')).toBe(false);
  });

  it('rejects blank names', () => {
    expect(matchesImportLanguage('   ', 'M')).toBe(false);
    expect(matchesImportLanguage(null, 'E')).toBe(false);
  });
});
