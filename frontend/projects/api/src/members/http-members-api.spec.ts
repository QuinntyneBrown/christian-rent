import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpChurchesApi } from './http-churches-api';
import { HttpMembersApi } from './http-members-api';
import type { JoinRequest, Member } from './member';

const sarah: Member = {
  id: 'm1',
  name: 'Sarah Kim',
  churchName: 'Grace Community Church',
  isVerified: false,
  isAdmin: false,
};

// become-member design; ADR 0017.
describe('HttpMembersApi and HttpChurchesApi', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpMembersApi, HttpChurchesApi, provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('answers the member who is signed in', async () => {
    const me = TestBed.inject(HttpMembersApi).me();

    backend.expectOne('/api/members/me').flush(sarah);

    expect(await me).toEqual(sarah);
  });

  it('answers null for a signed-in person who is not a member (204)', async () => {
    const me = TestBed.inject(HttpMembersApi).me();

    backend.expectOne('/api/members/me').flush(null, { status: 204, statusText: 'No Content' });

    expect(await me).toBeNull();
  });

  it('posts what a person joins with', async () => {
    const request: JoinRequest = {
      name: 'Sarah Kim',
      churchId: 'grace',
      newChurchName: null,
      newChurchCity: null,
      declaresChristian: true,
    };
    const joined = TestBed.inject(HttpMembersApi).join(request);

    const call = backend.expectOne('/api/members');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush(sarah, { status: 201, statusText: 'Created' });

    expect(await joined).toEqual(sarah);
  });

  it('lists the churches, and cancels the request when it is aborted', async () => {
    const api = TestBed.inject(HttpChurchesApi);
    const churches = api.list(new AbortController().signal);
    backend.expectOne('/api/churches').flush([{ id: 'g', name: 'Grace', city: 'Langley' }]);
    expect(await churches).toEqual([{ id: 'g', name: 'Grace', city: 'Langley' }]);

    const abort = new AbortController();
    const aborted = api.list(abort.signal);
    const call = backend.expectOne('/api/churches');
    abort.abort(new DOMException('Left', 'AbortError'));

    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' });
    expect(call.cancelled).toBe(true);
  });
});
