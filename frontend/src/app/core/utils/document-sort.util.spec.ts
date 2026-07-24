import { compareCreatedDateDesc, parseSortableDate } from './document-sort.util';

describe('document-sort.util', () => {
  it('sorts documents by created date descending', () => {
    const sorted = [
      { createdDate: '2026-07-10', documentUploadID: 1 },
      { createdDate: '2026-07-24', documentUploadID: 3 },
      { createdDate: '2026-07-20', documentUploadID: 2 }
    ].sort(compareCreatedDateDesc);

    expect(sorted.map((d) => d.documentUploadID)).toEqual([3, 2, 1]);
  });

  it('uses documentUploadID when dates are equal', () => {
    const sorted = [
      { createdDate: '2026-07-20', documentUploadID: 1 },
      { createdDate: '2026-07-20', documentUploadID: 5 }
    ].sort(compareCreatedDateDesc);

    expect(sorted[0].documentUploadID).toBe(5);
  });

  it('parses date-only values', () => {
    expect(parseSortableDate('2026-07-20')).toBeGreaterThan(parseSortableDate('2026-07-19'));
  });
});
