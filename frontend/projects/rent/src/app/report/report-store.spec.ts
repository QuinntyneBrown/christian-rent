import { TestBed } from '@angular/core/testing';
import { REPORTS_API, type ReportsApi } from '@rent/api';
import { ReportStore } from './report-store';

const REPORTED_AT = '2026-06-08T15:00:00Z';

function store(report: ReportsApi['report']): ReportStore {
  TestBed.configureTestingModule({
    providers: [ReportStore, { provide: REPORTS_API, useValue: { report } }],
  });
  return TestBed.inject(ReportStore);
}

const answers = () => vi.fn<ReportsApi['report']>().mockResolvedValue({ reportedAt: REPORTED_AT });

/** A send that stays in flight until the test ends it. */
function held() {
  let end!: (reportedAt: string) => void;
  const report = vi
    .fn<ReportsApi['report']>()
    .mockImplementation(
      () => new Promise((resolve) => (end = (reportedAt) => resolve({ reportedAt }))),
    );
  return { report, end: (reportedAt = REPORTED_AT) => end(reportedAt) };
}

// report-listing design; L2-021 criteria 2, 7 and 9.
describe('ReportStore', () => {
  it('opens with nothing chosen, nothing written and no error', () => {
    const subject = store(answers());

    expect(subject.reason()).toBeNull();
    expect(subject.note()).toBe('');
    expect(subject.state()).toBe('form');
    expect(subject.reasonError()).toBeNull();
    expect(subject.counter()).toBe('0 / 500');
  });

  it('counts the note as it is sent', () => {
    const subject = store(answers());

    subject.setNote('  Pay first.\r\n  ');

    expect(subject.counter()).toBe('10 / 500');
  });

  it('sends nothing without a reason, and asks for one until it is chosen', async () => {
    const report = answers();
    const subject = store(report);

    expect(await subject.send('hall')).toBe('invalid');

    expect(subject.reasonError()).toBe('Choose a reason.');
    expect(report).not.toHaveBeenCalled();
    subject.choose('scam');
    expect(subject.reasonError()).toBeNull();
  });

  it('sends the reason and note and answers when it was filed', async () => {
    const report = answers();
    const subject = store(report);
    subject.choose('scam');
    subject.setNote(' Pay first. ');

    expect(await subject.send('hall')).toBe('reported');

    expect(report).toHaveBeenCalledWith(
      'hall',
      { reason: 'scam', note: 'Pay first.' },
      expect.any(AbortSignal),
    );
    expect(subject.state()).toBe('success');
    expect(subject.reportedAt()).toBe(REPORTED_AT);
  });

  it('is busy while it sends, changes nothing and sends once', async () => {
    const { report, end } = held();
    const subject = store(report);
    subject.choose('scam');
    const sent = subject.send('hall');

    expect(subject.state()).toBe('busy');
    subject.choose('fake');
    subject.setNote('more');
    expect(await subject.send('hall')).toBe('ignored');
    expect(subject.reason()).toBe('scam');
    expect(subject.note()).toBe('');
    expect(report).toHaveBeenCalledTimes(1);

    end();
    await sent;
  });

  it('aborts a report in flight when the dialog goes, and says nothing of it', async () => {
    let signal!: AbortSignal;
    const subject = store((_, __, given) => {
      signal = given;
      return new Promise((_, reject) =>
        given.addEventListener('abort', () => reject(given.reason)),
      );
    });
    subject.choose('scam');
    const sent = subject.send('hall');

    TestBed.resetTestingModule();

    expect(signal.aborted).toBe(true);
    expect(await sent).toBe('ignored');
  });
});
