import { Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SESSION } from '@rent/api';
import { firstValueFrom } from 'rxjs';

/** What a person was doing when they were asked to join (ADR 0018). */
export type MemberPurpose = 'post' | 'message' | 'report';

/**
 * The check before posting, messaging or reporting (become-member design; L2-009 criterion 4,
 * L2-015 criterion 5, L2-021 criterion 5). A member goes on at once. Anyone else is asked again
 * who they are. Someone not signed in is taken to the sign-in page, to come back to this address
 * (ADR 0029), and the answer is no; what they wrote is kept in the tab. Someone signed in who is
 * still not a member is asked to join in a dialog whose code loads only then. It answers whether
 * they are a member when it is done; the caller has kept what was entered, and the CDK dialog
 * returns focus to the control that asked.
 */
@Injectable({ providedIn: 'root' })
export class MemberGate {
  private readonly session = inject(SESSION);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);

  async requireMember(purpose: MemberPurpose): Promise<boolean> {
    if (this.session.member()) {
      return true;
    }
    await this.session.refresh();
    if (this.session.member()) {
      return true;
    }
    if (this.session.state() === 'signed-out') {
      await this.router.navigate(['/sign-in'], { queryParams: { return: this.router.url } });
      return false;
    }
    const [{ Dialog }, { openJoinDialog }] = await Promise.all([
      import('@angular/cdk/dialog'),
      import('../join/join-dialog'),
    ]);
    const dialog = openJoinDialog(this.injector.get(Dialog), purpose);
    return (await firstValueFrom(dialog.closed)) === true;
  }
}
