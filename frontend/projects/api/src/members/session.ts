import { InjectionToken, type Signal } from '@angular/core';
import type { MemberSummary } from './member-summary';

/**
 * The signed-in member, or null when nobody is. Sign-in is not designed (ADR 0005): until it is,
 * the binding in app.config.ts answers null. Journey 5 adds `refresh()`.
 */
export interface Session {
  readonly member: Signal<MemberSummary | null>;
}

export const SESSION = new InjectionToken<Session>('SESSION');
