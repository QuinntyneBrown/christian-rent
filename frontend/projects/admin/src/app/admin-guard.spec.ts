import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Route, Router, UrlTree, provideRouter } from '@angular/router';
import { SESSION, type MemberSummary, type SessionState } from '@rent/api';
import { adminGuard } from './admin-guard';

const naomi: MemberSummary = {
  id: 'm1',
  name: 'Naomi Friesen',
  initials: 'NF',
  churchName: 'Grace Community Church',
  isAdmin: true,
  isVerified: true,
};

// L2-019 criterion 5; L2-038 criteria 2 and 3: who the review page's route matches, one case
// per row.
describe('adminGuard', () => {
  const cases: [string, SessionState, MemberSummary | null, boolean | string][] = [
    ['an admin', 'signed-in', naomi, true],
    ['a member who is not an admin', 'signed-in', { ...naomi, isAdmin: false }, false],
    ['someone signed in who is not a member', 'signed-in', null, false],
    ['someone Admin cannot ask about', 'unknown', null, false],
    ['nobody signed in to Admin', 'signed-out', null, '/sign-in?return=%2F'],
  ];

  it.each(cases)('decides for %s', async (_who, state, answered, decision) => {
    const member = signal<MemberSummary | null>(null);
    const known = signal<SessionState>('unknown');
    // Who is signed in is known only once asked.
    const refresh = vi.fn(async () => {
      member.set(answered);
      known.set(state);
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SESSION, useValue: { member, state: known, refresh } },
      ],
    });

    const matched = await TestBed.runInInjectionContext(() =>
      adminGuard({} as Route, [], {} as never),
    );

    const answer =
      matched instanceof UrlTree ? TestBed.inject(Router).serializeUrl(matched) : matched;
    expect(answer).toBe(decision);
    expect(refresh).toHaveBeenCalledOnce();
  });
});
