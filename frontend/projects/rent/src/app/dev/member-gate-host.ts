import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Button } from '@rent/components';
import { MemberGate, type MemberPurpose } from '../members/member-gate';

/**
 * A host page that only the `e2e` build has (ADR 0018): it calls `MemberGate` for each purpose
 * and says what it answered, with a draft field to show that the page keeps what was typed.
 */
import { RentHeader } from '../shell/rent-header';

@Component({
  selector: 'cr-member-gate-host',
  imports: [RentHeader, Button],
  templateUrl: './member-gate-host.html',
  styleUrl: './member-gate-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberGateHost {
  protected readonly answer = signal('');
  private readonly gate = inject(MemberGate);

  protected async ask(purpose: MemberPurpose): Promise<void> {
    const isMember = await this.gate.requireMember(purpose);
    this.answer.set(isMember ? 'Member: yes' : 'Member: no');
  }
}
