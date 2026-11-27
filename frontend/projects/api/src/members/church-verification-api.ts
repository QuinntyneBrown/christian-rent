import { InjectionToken } from '@angular/core';

/**
 * Confirming a church, as Admin does from the detail of a new member (verify-members-and-churches
 * design; ADR 0031). Only an admin is answered; anyone else is refused with `not_signed_in` or
 * `not_an_admin`. Aborting `signal` cancels the request, and the promise rejects with an
 * `AbortError`; a failure rejects with an `ApiError`.
 */
export interface ChurchVerificationApi {
  /**
   * Makes the church verified. Confirming a verified church again resolves and changes nothing;
   * one that does not exist rejects with the code `not_found`.
   */
  verify(churchId: string, signal: AbortSignal): Promise<void>;
}

export const CHURCH_VERIFICATION_API = new InjectionToken<ChurchVerificationApi>(
  'CHURCH_VERIFICATION_API',
);
