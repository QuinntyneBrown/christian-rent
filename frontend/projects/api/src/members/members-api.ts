import { InjectionToken } from '@angular/core';
import type { ChurchOption, JoinRequest, Member } from './member';

/**
 * Joining (become-member design; ADR 0017). Who is signed in is `SessionApi`'s (ADR 0029).
 */
export interface MembersApi {
  /** Makes the signed-in person a member. A refusal rejects with an `ApiError`. */
  join(request: JoinRequest): Promise<Member>;
}

export const MEMBERS_API = new InjectionToken<MembersApi>('MEMBERS_API');

/** The churches to pick from when joining (L2-017, criterion 8). */
export interface ChurchesApi {
  /** Every church, by name. Aborting `signal` cancels it; a failure rejects with an `ApiError`. */
  list(signal: AbortSignal): Promise<readonly ChurchOption[]>;
}

export const CHURCHES_API = new InjectionToken<ChurchesApi>('CHURCHES_API');
