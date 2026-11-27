import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Member } from './member';
import type { Credentials, SessionApi } from './session-api';

/** Answers a 200 with the member and a 204 with null. */
async function memberOf(
  response: Promise<{ status: number; body: Member | null }>,
): Promise<Member | null> {
  const answer = await response;
  return answer.status === 204 ? null : answer.body;
}

/** `SessionApi` of `rent`: the member session (`/api/session`, `/api/members/me`). */
@Injectable()
export class HttpMemberSessionApi implements SessionApi {
  private readonly http = inject(HttpClient);

  me(): Promise<Member | null> {
    return memberOf(
      firstValueFrom(this.http.get<Member>('/api/members/me', { observe: 'response' })),
    );
  }

  signIn(credentials: Credentials): Promise<Member | null> {
    return memberOf(
      firstValueFrom(this.http.post<Member>('/api/session', credentials, { observe: 'response' })),
    );
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.http.delete<void>('/api/session'));
  }
}

/** `SessionApi` of Admin: the Admin session (`/api/admin/session`). */
@Injectable()
export class HttpAdminSessionApi implements SessionApi {
  private readonly http = inject(HttpClient);

  me(): Promise<Member | null> {
    return memberOf(
      firstValueFrom(this.http.get<Member>('/api/admin/session', { observe: 'response' })),
    );
  }

  signIn(credentials: Credentials): Promise<Member | null> {
    return memberOf(
      firstValueFrom(
        this.http.post<Member>('/api/admin/session', credentials, { observe: 'response' }),
      ),
    );
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.http.delete<void>('/api/admin/session'));
  }
}

/** The addresses a session's own requests go to, which never count as a session that ended. */
export const SESSION_PATHS: readonly string[] = [
  '/api/session',
  '/api/members/me',
  '/api/admin/session',
];
