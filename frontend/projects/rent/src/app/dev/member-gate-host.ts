import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SESSION } from '@rent/api';
import { Button, SiteHeader } from '@rent/components';
import { MemberGate, type MemberPurpose } from '../members/member-gate';

/**
 * A host page that only the `e2e` build has (ADR 0018): it calls `MemberGate` for each purpose
 * and says what it answered, with a draft field to show that the page keeps what was typed.
 */
@Component({
  selector: 'cr-member-gate-host',
  imports: [Button, SiteHeader],
  templateUrl: './member-gate-host.html',
  styleUrl: './member-gate-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberGateHost {
  protected readonly member = inject(SESSION).member;
  protected readonly answer = signal('');
  private readonly gate = inject(MemberGate);

  protected async ask(purpose: MemberPurpose): Promise<void> {
    const isMember = await this.gate.requireMember(purpose);
    this.answer.set(isMember ? 'Member: yes' : 'Member: no');
  }
}
