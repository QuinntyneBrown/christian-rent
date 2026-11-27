import { InjectionToken } from '@angular/core';
import type { Member } from './member';

/** What a person signs in with (L2-037). Never kept beyond the request. */
export interface Credentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Who is signed in to this application, signing in and out (ADR 0029). Each application binds
 * its own: `rent` the member session, Admin the Admin session.
 */
export interface SessionApi {
  /**
   * Who is signed in, as a member, or null for someone signed in who is not one (204). A refusal,
   * such as 401 `not_signed_in`, rejects with an `ApiError`.
   */
  me(): Promise<Member | null>;

  /** Signs in: the member, or null for an account that is not one. A refusal rejects with an `ApiError`. */
  signIn(credentials: Credentials): Promise<Member | null>;

  /** Signs out of this application only. */
  signOut(): Promise<void>;
}

export const SESSION_API = new InjectionToken<SessionApi>('SESSION_API');
