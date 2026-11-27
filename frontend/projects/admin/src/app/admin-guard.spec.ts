import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Route, UrlSegment } from '@angular/router';
import { SESSION, type MemberSummary } from '@rent/api';
import { adminGuard } from './admin-guard';

const naomi: MemberSummary = {
  id: 'm1',
  name: 'Naomi Friesen',
  initials: 'NF',
  churchName: 'Grace Community Church',
  isAdmin: true,
  isVerified: true,
};

// L2-019 criterion 5; ADR 0028: who the review page's route matches, one case per row.
describe('adminGuard', () => {
  const cases: [string, MemberSummary | null, boolean][] = [
    ['an admin', naomi, true],
    ['a member who is not an admin', { ...naomi, isAdmin: false }, false],
    ['someone who is not a member', null, false],
  ];

  it.each(cases)('decides for %s', async (_who, answered, allowed) => {
    const member = signal<MemberSummary | null>(null);
    // Who is signed in is known only once asked.
    const refresh = vi.fn(async () => member.set(answered));
    TestBed.configureTestingModule({
      providers: [{ provide: SESSION, useValue: { member, refresh } }],
    });

    const matched = await TestBed.runInInjectionContext(() =>
      adminGuard({} as Route, [] as UrlSegment[], {} as never),
    );

    expect(matched).toBe(allowed);
    expect(refresh).toHaveBeenCalledOnce();
  });
});
