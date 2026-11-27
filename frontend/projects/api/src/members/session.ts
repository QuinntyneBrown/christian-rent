import { InjectionToken, type Signal } from '@angular/core';
import type { MemberSummary } from './member-summary';

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
}

export const SESSION = new InjectionToken<Session>('SESSION');
