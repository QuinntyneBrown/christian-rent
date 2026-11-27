import { Injectable, inject, signal } from '@angular/core';
import {
  MEMBERS_API,
  type Member,
  type MemberSummary,
  type Session,
  type SessionState,
  isApiError,
} from '@rent/api';
import { initialsOf } from '@rent/domain';

/**
 * `SESSION` over the backend (ADR 0017, ADR 0029): who is signed in, from `GET /api/members/me`.
 * A member is `signed-in` with a member; someone who is not a member (204) is `signed-in` with
 * none; 401 is `signed-out`; a failure is `unknown`, with no member, so a screen never shows a
 * member it is not sure of. The initials follow from the name (ADR 0016).
 */
@Injectable()
export class ApiSession implements Session {
  private readonly api = inject(MEMBERS_API);
  private readonly current = signal<MemberSummary | null>(null);
  private readonly known = signal<SessionState>('unknown');

  readonly member = this.current.asReadonly();
  readonly state = this.known.asReadonly();

  async refresh(): Promise<void> {
    try {
      const member = await this.api.me();
      this.current.set(member ? toSummary(member) : null);
      this.known.set('signed-in');
    } catch (error) {
      this.current.set(null);
      this.known.set(isApiError(error) && error.status === 401 ? 'signed-out' : 'unknown');
    }
  }
}

function toSummary(member: Member): MemberSummary {
  return {
    id: member.id,
    name: member.name,
    initials: initialsOf(member.name),
    churchName: member.churchName,
    isAdmin: member.isAdmin,
    isVerified: member.isVerified,
  };
}
