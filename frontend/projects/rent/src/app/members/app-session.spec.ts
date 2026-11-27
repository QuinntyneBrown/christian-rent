import { TestBed } from '@angular/core/testing';
import { MEMBERS_API, type Member, type MembersApi } from '@rent/api';
import { AppSession } from './app-session';

const sarah: Member = {
  id: 'm1',
  name: 'Sarah Kim',
  churchName: 'Grace Community Church',
  isVerified: false,
  isAdmin: false,
};

function session(me: MembersApi['me']): AppSession {
  TestBed.configureTestingModule({
    providers: [AppSession, { provide: MEMBERS_API, useValue: { me, join: vi.fn() } }],
  });
  return TestBed.inject(AppSession);
}

// ADR 0017: SESSION answers who is signed in as a member, or null.
describe('AppSession', () => {
  it('is nobody until it has asked', () => {
    expect(session(vi.fn()).member()).toBeNull();
  });

  it('is the member the backend answers, with their initials', async () => {
    const subject = session(() => Promise.resolve(sarah));

    await subject.refresh();

    expect(subject.member()).toEqual({
      id: 'm1',
      name: 'Sarah Kim',
      initials: 'SK',
      churchName: 'Grace Community Church',
      isAdmin: false,
      isVerified: false,
    });
  });

  it('is nobody for a person who is not a member', async () => {
    const answers = [sarah, null];
    const subject = session(() => Promise.resolve(answers.shift() ?? null));
    await subject.refresh();

    await subject.refresh();

    expect(subject.member()).toBeNull();
  });

  it('is nobody when the backend refuses or cannot be reached', async () => {
    const answers: (() => Promise<Member | null>)[] = [
      () => Promise.resolve(sarah),
      () =>
        Promise.reject({
          status: 401,
          code: 'not_signed_in',
          retryAt: null,
          reportedAt: null,
          decided: null,
          fields: null,
        }),
    ];
    const subject = session(() => answers.shift()!());
    await subject.refresh();

    await subject.refresh();

    expect(subject.member()).toBeNull();
  });

  // ADR 0024: adminGuard awaits the first answer before it decides.
  it('is ready only once the first answer has been taken', async () => {
    let answer!: (member: Member | null) => void;
    const subject = session(() => new Promise((resolve) => (answer = resolve)));
    let ready = false;
    void subject.ready().then(() => (ready = true));

    const refreshing = subject.refresh();
    await Promise.resolve();
    expect(ready).toBe(false);
    answer(sarah);
    await refreshing;
    await Promise.resolve();

    expect(ready).toBe(true);
    expect(subject.member()?.name).toBe('Sarah Kim');
  });

  it('is ready when the first answer fails', async () => {
    const subject = session(() => Promise.reject(new Error('offline')));

    await subject.refresh();

    await expect(subject.ready()).resolves.toBeUndefined();
  });
});
