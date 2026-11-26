import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DIALOG_DATA, type Dialog, DialogRef } from '@angular/cdk/dialog';
import type { Injector } from '@angular/core';
import { Alert, Button, Dialog as DialogPanel } from '@rent/components';
import type { ConfirmRemoveWords } from '@rent/domain';
import type { DecideResult } from './review-decider';

/** What is removed, and the removal itself, which the dialog runs and may run again. */
export interface ConfirmRemoveData {
  readonly words: ConfirmRemoveWords;
  readonly remove: () => Promise<DecideResult | null>;
}

/** "Keep it", which takes focus as the dialog opens: the safe choice (L2-020, criterion 4). */
const KEEP_IT = '.confirm-remove__keep';

/**
 * Opens the confirmation over Admin (L2-032, criterion 9): labelled by its title, focus on
 * "Keep it", held inside, and returned to Remove when it is kept. `cr-dialog` draws its own
 * backdrop, so the CDK draws none.
 */
export function openConfirmRemoveDialog(
  dialogs: Dialog,
  data: ConfirmRemoveData,
  injector: Injector,
): DialogRef<DecideResult, ConfirmRemoveDialog> {
  return dialogs.open<DecideResult, ConfirmRemoveData, ConfirmRemoveDialog>(ConfirmRemoveDialog, {
    data,
    injector,
    ariaLabelledBy: 'confirm-remove-title',
    ariaDescribedBy: 'confirm-remove-description',
    autoFocus: KEEP_IT,
    restoreFocus: true,
    hasBackdrop: false,
  });
}

/**
 * "Remove …?" (decide-review-item design; docs/mocks/dialogs/confirm-remove/): names what is
 * removed and what follows, for a new listing, a reported listing or a new member. Its states are
 * default, busy and failed. While the removal is sent nothing can be pressed or closed; one that
 * fails says nothing has changed and offers "Try again". It closes once the removal is saved, or
 * refused because another admin decided first. Its code loads only when Remove is pressed.
 */
@Component({
  selector: 'cr-confirm-remove-dialog',
  imports: [Alert, Button, DialogPanel],
  templateUrl: './confirm-remove-dialog.html',
  styleUrl: './confirm-remove-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmRemoveDialog {
  protected readonly data = inject<ConfirmRemoveData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<DecideResult>>(DialogRef);

  protected readonly state = signal<'default' | 'busy' | 'failed'>('default');
  protected readonly busy = computed(() => this.state() === 'busy');

  constructor() {
    // Escape and Close do nothing while the removal is in flight (L2-020, criterion 10).
    effect(() => {
      this.dialogRef.disableClose = this.busy();
    });
  }

  protected close(): void {
    if (!this.busy()) {
      this.dialogRef.close();
    }
  }

  protected async remove(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.state.set('busy');
    const result = await this.data.remove();
    if (result === 'failed' || result === null) {
      this.state.set('failed');
      return;
    }
    this.state.set('default');
    this.dialogRef.close(result);
  }
}
