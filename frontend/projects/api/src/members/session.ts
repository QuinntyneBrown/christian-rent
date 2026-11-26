import { InjectionToken, type Signal } from '@angular/core';
import type { MemberSummary } from './member-summary';

/**
 * The signed-in member, or null when nobody is, or the person signed in is not a member
 * (ADR 0005, ADR 0017). Bound in app.config.ts, because the whole app shares it.
 */
export interface Session {
  readonly member: Signal<MemberSummary | null>;

  /** Asks the backend again who is signed in; never rejects. */
  refresh(): Promise<void>;
}

export const SESSION = new InjectionToken<Session>('SESSION');
