import { Injectable, Injector, inject } from '@angular/core';
import { SESSION } from '@rent/api';
import { firstValueFrom } from 'rxjs';

/** What a person was doing when they were asked to join (ADR 0018). */
export type MemberPurpose = 'post' | 'message' | 'report';

/**
 * The check before posting, messaging or reporting (become-member design; L2-009 criterion 4,
 * L2-015 criterion 5, L2-021 criterion 5). A member goes on at once. Anyone else is asked again
 * who they are and, if still not a member, is asked to join in a dialog whose code loads only
 * then. It answers whether they are a member when it is done; the caller has kept what was
 * entered, and the CDK dialog returns focus to the control that asked.
 */
@Injectable({ providedIn: 'root' })
export class MemberGate {
  private readonly session = inject(SESSION);
  private readonly injector = inject(Injector);

  async requireMember(purpose: MemberPurpose): Promise<boolean> {
    if (this.session.member()) {
      return true;
    }
    await this.session.refresh();
    if (this.session.member()) {
      return true;
    }
    const [{ Dialog }, { openJoinDialog }] = await Promise.all([
      import('@angular/cdk/dialog'),
      import('../join/join-dialog'),
    ]);
    const dialog = openJoinDialog(this.injector.get(Dialog), purpose);
    return (await firstValueFrom(dialog.closed)) === true;
  }
}
