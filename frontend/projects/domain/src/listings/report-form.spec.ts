import {
  REPORT_REASONS,
  cleanReportNote,
  toReportDialogCopy,
  toReportRequest,
  validateReportReason,
} from './report-form';

// report-listing design; L2-021, criteria 1, 6 and 7; ADR 0023.
describe('the report form', () => {
  it('offers the four reasons of the mock, in its order', () => {
    expect(REPORT_REASONS).toEqual([
      { value: 'fake', label: 'Not a real listing' },
      { value: 'inappropriate', label: 'Inappropriate' },
      { value: 'scam', label: 'A scam' },
      { value: 'other', label: 'Something else' },
    ]);
  });

  it.each([
    [null, 'Choose a reason.'],
    ['fake', null],
    ['inappropriate', null],
    ['scam', null],
    ['other', null],
  ] as const)('asks for a reason: %s', (reason, error) => {
    expect(validateReportReason(reason)).toBe(error);
  });

  it.each([
    ['', ''],
    ['  \r\n ', ''],
    ['  Pay first.\r\nThen see it.\r ', 'Pay first.\nThen see it.'],
    ['a\u0007b\tc', 'ab\tc'],
    ['Café', 'Café'],
  ])('cleans the note %j as the backend counts it', (note, cleaned) => {
    expect(cleanReportNote(note)).toBe(cleaned);
  });

  it('sends the reason with the cleaned note', () => {
    expect(toReportRequest('scam', '  Pay first.  ')).toEqual({
      reason: 'scam',
      note: 'Pay first.',
    });
  });

  it('sends no note when nothing was written', () => {
    expect(toReportRequest('other', '  ')).toEqual({ reason: 'other', note: null });
  });

  it('says that an admin will look and the member who posted is never told', () => {
    expect(toReportDialogCopy('form', 'Dan')).toEqual({
      title: 'Report this listing',
      description: 'An admin will look at it. Dan is never told who reported.',
    });
  });

  it('thanks the member once the report is sent', () => {
    expect(toReportDialogCopy('success', 'Dan')).toEqual({
      title: 'Thanks. Your report was sent.',
      description: 'An admin will look at this listing. You don’t need to do anything else.',
    });
  });
});
