import type { ApiFixtures } from './api';
import type { MemberFixture } from './members';

/** The email and password the specs sign in with; any pair is answered as the spec says. */
export const CREDENTIALS = {
  email: 'sarah.kim@example.ca',
  password: 'correct horse battery staple',
};

/** `rent`'s member session, or Admin's (ADR 0029). */
export interface SessionPaths {
  readonly signIn: string;
  readonly me: string;
}
export const RENT_SESSION: SessionPaths = { signIn: '/api/session', me: '/api/members/me' };
export const ADMIN_SESSION: SessionPaths = {
  signIn: '/api/admin/session',
  me: '/api/admin/session',
};

/**
 * Signing in as the backend answers it: `POST` signs in as `member` (or an account that is not a
 * member, for null), after which who is signed in answers them; `DELETE` signs out again.
 */
export function answerSigningIn(
  api: ApiFixtures,
  member: MemberFixture | null,
  paths: SessionPaths = RENT_SESSION,
): void {
  let signedIn = false;
  const who = () => (member ? { body: member } : { status: 204 });
  api.answer('GET', paths.me, () =>
    signedIn
      ? who()
      : {
          status: 401,
          body: { type: 'about:blank', title: 'Refused', status: 401, code: 'not_signed_in' },
          headers: { 'content-type': 'application/problem+json' },
        },
  );
  api.answer('POST', paths.signIn, () => {
    signedIn = true;
    return member ? { body: member } : { status: 204 };
  });
  api.answer('DELETE', paths.signIn, () => {
    signedIn = false;
    return { status: 204 };
  });
}

/** Signing out as the backend answers it: 204, after which nobody is signed in. */
export function answerSigningOut(api: ApiFixtures, paths: SessionPaths = RENT_SESSION): void {
  api.answer('DELETE', paths.signIn, () => {
    api.refuse('GET', paths.me, 401, 'not_signed_in');
    return { status: 204 };
  });
}
