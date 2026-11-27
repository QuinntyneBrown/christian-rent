import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  type Credentials,
  type Member,
  type MemberSummary,
  SESSION_API,
  type Session,
  type SessionState,
  isApiError,
} from '@rent/api';
import { clearKeptDrafts, initialsOf, sessionStorageOf } from '@rent/domain';

/**
 * `SESSION` over the backend (ADR 0017, ADR 0029): who is signed in to this application, from
 * `SESSION_API`, which each application binds to its own session. A member is `signed-in` with a
 * member; someone who is not a member (204) is `signed-in` with none; 401 is `signed-out`; a
 * failure is `unknown`, with no member, so a screen never shows a member it is not sure of. The
 * initials follow from the name (ADR 0016).
 */
@Injectable()
export class ApiSession implements Session {
  private readonly api = inject(SESSION_API);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<MemberSummary | null>(null);
  private readonly known = signal<SessionState>('unknown');

  readonly member = this.current.asReadonly();
  readonly state = this.known.asReadonly();

  async refresh(): Promise<void> {
    try {
      this.know(await this.api.me());
    } catch (error) {
      this.current.set(null);
      this.known.set(isApiError(error) && error.status === 401 ? 'signed-out' : 'unknown');
    }
  }

  async signIn(credentials: Credentials): Promise<void> {
    this.know(await this.api.signIn(credentials));
  }

  /** Ends the session and forgets what was kept in the tab, even when the backend cannot be told. */
  async signOut(): Promise<void> {
    clearKeptDrafts(sessionStorageOf(this.document));
    try {
      await this.api.signOut();
    } finally {
      this.current.set(null);
      this.known.set('signed-out');
    }
  }

  expire(): void {
    this.current.set(null);
    this.known.set('signed-out');
    const here = this.router.url;
    if (!here.startsWith('/sign-in')) {
      void this.router.navigate(['/sign-in'], { queryParams: { return: here, expired: 1 } });
    }
  }

  private know(member: Member | null): void {
    this.current.set(member ? toSummary(member) : null);
    this.known.set('signed-in');
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
