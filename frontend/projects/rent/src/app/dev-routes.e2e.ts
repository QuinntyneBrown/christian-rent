import type { Routes } from '@angular/router';

/**
 * The host pages of the `e2e` build (ADR 0018). `/dev/member-gate` drives `MemberGate` until
 * Post, the message box and Report call it (journeys 6, 8 and 9); then it goes.
 */
export const devRoutes: Routes = [
  {
    path: 'dev/member-gate',
    title: 'Member gate',
    loadComponent: () => import('./dev/member-gate-host').then((m) => m.MemberGateHost),
  },
];
