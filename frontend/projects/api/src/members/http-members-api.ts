import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { JoinRequest, Member } from './member';
import type { MembersApi } from './members-api';

/** `MembersApi` over HTTP. Bound in app.config.ts with `SESSION`, which the whole app shares. */
@Injectable()
export class HttpMembersApi implements MembersApi {
  private readonly http = inject(HttpClient);

  join(request: JoinRequest): Promise<Member> {
    return firstValueFrom(this.http.post<Member>('/api/members', request));
  }

  async me(): Promise<Member | null> {
    const response = await firstValueFrom(
      this.http.get<Member>('/api/members/me', { observe: 'response' }),
    );
    return response.status === 204 ? null : response.body;
  }
}
