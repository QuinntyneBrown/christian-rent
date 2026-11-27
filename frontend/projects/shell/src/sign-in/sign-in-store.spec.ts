import { TestBed } from '@angular/core/testing';
import { type ApiError, SESSION, type Session } from '@rent/api';
import { SignInStore } from './sign-in-store';

function refusal(status: number, code: string | null, retryAt: string | null = null): ApiError {
  return { status, code, retryAt, reportedAt: null, fields: null };
}

function store(signIn: Session['signIn']): SignInStore {
  TestBed.configureTestingModule({
    providers: [SignInStore, { provide: SESSION, useValue: { signIn } }],
  });
  const subject = TestBed.inject(SignInStore);
  subject.email.set(' sarah.kim@example.ca ');
  subject.password.set('correct horse battery staple');
  return subject;
}

// L2-037 criteria 2, 4, 8 and 9: how an attempt ends, one case per row.
describe('SignInStore', () => {
  it('signs in with the email trimmed and the password as typed', async () => {
    const signIn = vi.fn(() => Promise.resolve());
    const subject = store(signIn);

    expect(await subject.submit()).toBe(true);
    expect(signIn).toHaveBeenCalledWith({
      email: 'sarah.kim@example.ca',
      password: 'correct horse battery staple',
    });
    expect(subject.status()).toBe('idle');
  });

  it('sends nothing with an empty field, marks it and moves focus to the first', async () => {
    const signIn = vi.fn();
    const subject = store(signIn);
    subject.email.set('');
    subject.password.set('');

    expect(await subject.submit()).toBe(false);
    expect(signIn).not.toHaveBeenCalled();
    expect(subject.errors()).toEqual({
      email: 'Enter your email.',
      password: 'Enter your password.',
    });
    expect(subject.focus()?.field).toBe('email');
  });

  const cases: [string, ApiError, string, string | null][] = [
    ['one refusal for every failure', refusal(401, 'sign_in_failed'), 'refused', null],
    [
      'too many attempts',
      refusal(429, 'rate_limited', '2026-06-08T22:15:00Z'),
      'limited',
      '2026-06-08T22:15:00Z',
    ],
    ['a backend that cannot be reached', refusal(0, null), 'error', null],
  ];

  it.each(cases)(
    'after %s keeps the email and clears the password',
    async (_case, error, status, retryAt) => {
      const subject = store(() => Promise.reject(error));

      expect(await subject.submit()).toBe(false);
      expect(subject.status()).toBe(status);
      expect(subject.retryAt()).toBe(retryAt);
      expect(subject.email()).toBe(' sarah.kim@example.ca ');
      expect(subject.password()).toBe('');
    },
  );

  it('ignores a second attempt while one is in flight', async () => {
    let release!: () => void;
    const signIn = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const subject = store(signIn);

    const first = subject.submit();
    expect(await subject.submit()).toBe(false);
    release();

    expect(await first).toBe(true);
    expect(signIn).toHaveBeenCalledOnce();
  });
});
