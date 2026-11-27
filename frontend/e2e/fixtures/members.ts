import type { ApiFixtures } from './api';

/** A member as `GET /api/members/me` answers (MemberDto), from the mocks' cast. */
export interface MemberFixture {
  id: string;
  name: string;
  churchName: string;
  isVerified: boolean;
  isAdmin: boolean;
}

export const SARAH_KIM: MemberFixture = {
  id: '5a7a4c3e-0000-4000-8000-000000000001',
  name: 'Sarah Kim',
  churchName: 'Grace Community Church',
  isVerified: false,
  isAdmin: false,
};

/** The churches of the join dialog's mock, as `GET /api/churches` answers them, by name. */
export const CHURCHES = [
  { id: 'c4a7e1f0-0003-4000-8000-000000000003', name: 'Cornerstone Church', city: 'Langley' },
  { id: 'c4a7e1f0-0001-4000-8000-000000000001', name: 'Grace Community Church', city: 'Langley' },
  { id: 'c4a7e1f0-0004-4000-8000-000000000004', name: 'New Song Fellowship', city: 'Langley' },
  { id: 'c4a7e1f0-0002-4000-8000-000000000002', name: 'Willoughby Baptist', city: 'Langley' },
];

/** Someone signed in who is not a member yet (204), who may join. */
export function answerNotAMember(api: ApiFixtures): void {
  api.answer('GET', '/api/members/me', { status: 204 });
}

/** Someone signed in who is already a member. */
export function answerMember(api: ApiFixtures, member: MemberFixture = SARAH_KIM): void {
  api.answer('GET', '/api/members/me', { body: member });
}

/**
 * Joining as the backend answers it: the churches, and `POST /api/members` making the person
 * `member`, after which `GET /api/members/me` answers them.
 */
export function answerJoining(api: ApiFixtures, member: MemberFixture = SARAH_KIM): void {
  let joined = false;
  api.answer('GET', '/api/churches', { body: CHURCHES });
  api.answer('GET', '/api/members/me', () => (joined ? { body: member } : { status: 204 }));
  api.answer('POST', '/api/members', () => {
    joined = true;
    return { status: 201, body: member };
  });
}
