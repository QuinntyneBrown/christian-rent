import { TestBed } from '@angular/core/testing';
import { type ApiError, MEMBERS_API, type Member, type MembersApi } from '@rent/api';
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

function session(me: MembersApi['me']): ApiSession {
  TestBed.configureTestingModule({
    providers: [ApiSession, { provide: MEMBERS_API, useValue: { me, join: vi.fn() } }],
  });
  return TestBed.inject(ApiSession);
}

// ADR 0017, ADR 0029: SESSION answers who is signed in, and the member they are, or null.
describe('ApiSession', () => {
  it('knows nobody until it has asked', () => {
    const subject = session(vi.fn());

    expect(subject.member()).toBeNull();
    expect(subject.state()).toBe('unknown');
  });

  it('is the member the backend answers, with their initials', async () => {
    const subject = session(() => Promise.resolve(sarah));

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

  // One case per answer of `GET /api/members/me` after a member was known.
  const cases: [string, () => Promise<Member | null>, string][] = [
    ['someone signed in who is not a member (204)', () => Promise.resolve(null), 'signed-in'],
    ['nobody signed in (401)', () => Promise.reject(refusal(401, 'not_signed_in')), 'signed-out'],
    ['a backend that cannot be reached', () => Promise.reject(refusal(0, null)), 'unknown'],
  ];

  it.each(cases)('has no member for %s', async (_who, answer, state) => {
    const answers = [() => Promise.resolve(sarah), answer];
    const subject = session(() => answers.shift()!());
    await subject.refresh();

    await subject.refresh();

    expect(subject.member()).toBeNull();
    expect(subject.state()).toBe(state);
  });
});
