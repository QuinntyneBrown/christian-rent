import { InjectionToken, type Signal } from '@angular/core';
import type { MemberSummary } from './member-summary';
import type { Credentials } from './session-api';

/**
 * Whether anyone is signed in to this application: not known yet (or the backend could not be
 * asked), nobody, or someone, member or not (ADR 0029).
 */
export type SessionState = 'unknown' | 'signed-out' | 'signed-in';

/**
 * Who is signed in to this application, and the member they are, or null when nobody is, or the
 * person signed in is not a member (ADR 0017, ADR 0029). Each application binds it in its own
 * app.config.ts, because the whole application shares it.
 */
export interface Session {
  readonly state: Signal<SessionState>;
  readonly member: Signal<MemberSummary | null>;

  /** Asks the backend again who is signed in; never rejects. */
  refresh(): Promise<void>;

  /** Signs in to this application; a refusal rejects with an `ApiError` (L2-037). */
  signIn(credentials: Credentials): Promise<void>;

  /** Signs out of this application only, and forgets what it kept in the tab (L2-039). */
  signOut(): Promise<void>;

  /**
   * The session ended while a screen was open: nobody is signed in, and the person is taken to the
   * sign-in page, to come back where they were (L2-040, criterion 2).
   */
  expire(): void;
}

export const SESSION = new InjectionToken<Session>('SESSION');
