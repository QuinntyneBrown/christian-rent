import { InjectionToken } from '@angular/core';
import type { ChurchOption, JoinRequest, Member } from './member';

/** Joining, and asking who one is (become-member design; ADR 0017). */
export interface MembersApi {
  /** Makes the signed-in person a member. A refusal rejects with an `ApiError`. */
  join(request: JoinRequest): Promise<Member>;

  /**
   * The signed-in person as a member, or null for someone who is not one (204). A refusal,
   * such as 401 `not_signed_in`, rejects with an `ApiError`.
   */
  me(): Promise<Member | null>;
}

export const MEMBERS_API = new InjectionToken<MembersApi>('MEMBERS_API');

/** The churches to pick from when joining (L2-017, criterion 8). */
export interface ChurchesApi {
  /** Every church, by name. Aborting `signal` cancels it; a failure rejects with an `ApiError`. */
  list(signal: AbortSignal): Promise<readonly ChurchOption[]>;
}

export const CHURCHES_API = new InjectionToken<ChurchesApi>('CHURCHES_API');
