import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpAdminSessionApi, HttpMemberSessionApi } from './http-session-api';
import type { Member } from './member';
import type { SessionApi } from './session-api';

const sarah: Member = {
  id: 'm1',
  name: 'Sarah Kim',
  churchName: 'Grace Community Church',
  isVerified: false,
  isAdmin: false,
};

const credentials = { email: 'sarah.kim@example.ca', password: 'correct horse battery staple' };

// ADR 0029: each application's session, at its own addresses, one case per row.
describe('HttpMemberSessionApi and HttpAdminSessionApi', () => {
  const cases: [string, new () => SessionApi, string, string][] = [
    ['rent', HttpMemberSessionApi, '/api/members/me', '/api/session'],
    ['Admin', HttpAdminSessionApi, '/api/admin/session', '/api/admin/session'],
  ];
  let backend: HttpTestingController;

  function api(type: new () => SessionApi): SessionApi {
    TestBed.configureTestingModule({
      providers: [type, provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    return TestBed.inject(type);
  }

  afterEach(() => backend.verify());

  it.each(cases)(
    'asks %s who is signed in: the member, or null for 204',
    async (_app, type, me) => {
      const subject = api(type);
      const member = subject.me();
      backend.expectOne({ method: 'GET', url: me }).flush(sarah);
      const nobody = subject.me();
      backend
        .expectOne({ method: 'GET', url: me })
        .flush(null, { status: 204, statusText: 'No Content' });

      expect(await member).toEqual(sarah);
      expect(await nobody).toBeNull();
    },
  );

  it.each(cases)('signs in to %s with the credentials', async (_app, type, _me, session) => {
    const signedIn = api(type).signIn(credentials);

    const request = backend.expectOne({ method: 'POST', url: session });
    expect(request.request.body).toEqual(credentials);
    request.flush(sarah);

    expect(await signedIn).toEqual(sarah);
  });

  it.each(cases)('signs out of %s alone', async (_app, type, _me, session) => {
    const signedOut = api(type).signOut();

    backend
      .expectOne({ method: 'DELETE', url: session })
      .flush(null, { status: 204, statusText: 'No Content' });

    await signedOut;
  });
});
