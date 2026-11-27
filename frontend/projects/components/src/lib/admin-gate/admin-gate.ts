import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Logo } from '../logo/logo';

/**
 * Admin's ink page around one card (docs/design-system/components/admin-gate.html): the inverse
 * logo, which stays in Admin, the label "Admin", and the page's one task as `<main>`. Admin's
 * sign-in page and its forbidden page use it (L2-038).
 */
@Component({
  selector: 'cr-admin-gate',
  imports: [Logo],
  templateUrl: './admin-gate.html',
  styleUrl: './admin-gate.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGate {}
