import { Injectable, inject, signal } from '@angular/core';
import { MEMBERS_API, type Member, type MemberSummary, type Session } from '@rent/api';
import { initialsOf } from '@rent/domain';

/**
 * `SESSION` for the app (ADR 0017): who is signed in as a member, from `GET /api/members/me`.
 * Someone who is not a member, nobody signed in (401), and a failure all leave it null, so a
 * screen never shows a member it is not sure of. The initials follow from the name (ADR 0016).
 * `ready()` settles once the first answer has been taken (ADR 0024).
 */
@Injectable()
export class AppSession implements Session {
  private readonly api = inject(MEMBERS_API);
  private readonly current = signal<MemberSummary | null>(null);

  private settle!: () => void;
  private readonly first = new Promise<void>((resolve) => (this.settle = resolve));

  readonly member = this.current.asReadonly();

  async refresh(): Promise<void> {
    try {
      const member = await this.api.me();
      this.current.set(member ? toSummary(member) : null);
    } catch {
      this.current.set(null);
    } finally {
      this.settle();
    }
  }

  ready(): Promise<void> {
    return this.first;
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
