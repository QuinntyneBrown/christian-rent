import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { type ApiError, type Member, SESSION_API, type SessionApi } from '@rent/api';
import { DRAFT_KEY, messageDraftKey } from '@rent/domain';
import { ApiSession } from './api-session';

const sarah: Member = {
  id: 'm1',
  name: 'Sarah Kim',
  churchName: 'Grace Community Church',
  isVerified: false,
  isAdmin: false,
};

function refusal(status: number, code: string | null): ApiError {
  return { status, code, retryAt: null, reportedAt: null, fields: null };
}

function session(api: Partial<SessionApi>): ApiSession {
  TestBed.configureTestingModule({
    providers: [ApiSession, provideRouter([]), { provide: SESSION_API, useValue: api }],
  });
  return TestBed.inject(ApiSession);
}

// ADR 0017, ADR 0029: SESSION answers who is signed in, and the member they are, or null.
describe('ApiSession', () => {
  it('knows nobody until it has asked', () => {
    const subject = session({});

    expect(subject.member()).toBeNull();
    expect(subject.state()).toBe('unknown');
  });

  it('is the member the backend answers, with their initials', async () => {
    const subject = session({ me: () => Promise.resolve(sarah) });

    await subject.refresh();

    expect(subject.state()).toBe('signed-in');
    expect(subject.member()).toEqual({
      id: 'm1',
      name: 'Sarah Kim',
      initials: 'SK',
      churchName: 'Grace Community Church',
      isAdmin: false,
      isVerified: false,
    });
  });

  // One case per answer of who is signed in, after a member was known.
  const cases: [string, () => Promise<Member | null>, string][] = [
    ['someone signed in who is not a member (204)', () => Promise.resolve(null), 'signed-in'],
    ['nobody signed in (401)', () => Promise.reject(refusal(401, 'not_signed_in')), 'signed-out'],
    ['a backend that cannot be reached', () => Promise.reject(refusal(0, null)), 'unknown'],
  ];

  it.each(cases)('has no member for %s', async (_who, answer, state) => {
    const answers = [() => Promise.resolve(sarah), answer];
    const subject = session({ me: () => answers.shift()!() });
    await subject.refresh();

    await subject.refresh();

    expect(subject.member()).toBeNull();
    expect(subject.state()).toBe(state);
  });

  it('is the member it signed in as', async () => {
    const subject = session({ signIn: () => Promise.resolve(sarah) });

    await subject.signIn({ email: 'sarah.kim@example.ca', password: 'correct horse' });

    expect(subject.state()).toBe('signed-in');
    expect(subject.member()?.name).toBe('Sarah Kim');
  });

  // L2-039 criteria 1 and 5.
  it('signs out, forgetting what was kept in the tab, even when the backend cannot be told', async () => {
    sessionStorage.setItem(DRAFT_KEY, '{}');
    sessionStorage.setItem(messageDraftKey('hall'), '{}');
    const subject = session({
      me: () => Promise.resolve(sarah),
      signOut: () => Promise.reject(refusal(0, null)),
    });
    await subject.refresh();

    await expect(subject.signOut()).rejects.toBeDefined();

    expect(subject.state()).toBe('signed-out');
    expect(subject.member()).toBeNull();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(sessionStorage.getItem(messageDraftKey('hall'))).toBeNull();
  });

  // L2-040 criterion 2.
  it('takes the person to the sign-in page when the session ends, to come back', async () => {
    const subject = session({ me: () => Promise.resolve(sarah) });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await subject.refresh();

    subject.expire();

    expect(subject.state()).toBe('signed-out');
    expect(navigate).toHaveBeenCalledWith(['/sign-in'], {
      queryParams: { return: '/', expired: 1 },
    });
  });
});
