import {
  ChangeDetectionStrategy,
  Component,
  type Injector,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DIALOG_DATA, type Dialog, DialogRef } from '@angular/cdk/dialog';
import { Alert, Button, Dialog as DialogPanel } from '@rent/components';
import type { RemoveCopy } from '@rent/domain';
import type { DecisionOutcome } from './review-queue-store';

/** What is being removed, in words, and how to remove it. */
export interface ConfirmRemoveData {
  readonly copy: RemoveCopy;
  readonly confirm: () => Promise<DecisionOutcome>;
}

/** "Keep it", which takes focus as the dialog opens (L2-020, criterion 9). */
const KEEP_IT = '.confirm-remove-dialog__keep';

/**
 * Opens the confirmation over Admin (L2-032, criterion 9): labelled by its title, described by
 * what follows, focus on "Keep it", held inside, and returned to Remove when it is kept. It
 * closes with what came of the removal, or with nothing when it was kept. `injector` is the
 * page's. `cr-dialog` draws its own backdrop and covers the viewport, so the CDK draws none.
 */
export function openConfirmRemoveDialog(
  dialogs: Dialog,
  data: ConfirmRemoveData,
  injector: Injector,
): DialogRef<DecisionOutcome, ConfirmRemoveDialog> {
  return dialogs.open<DecisionOutcome, ConfirmRemoveData, ConfirmRemoveDialog>(
    ConfirmRemoveDialog,
    {
      data,
      injector,
      ariaLabelledBy: 'confirm-remove-title',
      ariaDescribedBy: 'confirm-remove-description',
      autoFocus: KEEP_IT,
      restoreFocus: true,
      hasBackdrop: false,
    },
  );
}

/**
 * "Remove …?" (decide-review-item design; L2-020, criteria 4, 9 and 10;
 * docs/mocks/dialogs/confirm-remove/). Its states are default, busy and failed. While the
 * removal is in flight it cannot be kept or closed; one that fails says that nothing has
 * changed and offers "Try again". It takes no reason.
 */
@Component({
  selector: 'cr-confirm-remove-dialog',
  imports: [Alert, Button, DialogPanel],
  templateUrl: './confirm-remove-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmRemoveDialog {
  private readonly data = inject<ConfirmRemoveData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<DecisionOutcome>>(DialogRef);

  protected readonly copy = this.data.copy;
  private readonly state = signal<'default' | 'busy' | 'failed'>('default');
  protected readonly busy = computed(() => this.state() === 'busy');
  protected readonly failed = computed(() => this.state() === 'failed');

  constructor() {
    // Escape does nothing while the removal is in flight (L2-020, criterion 10).
    effect(() => {
      this.dialogRef.disableClose = this.busy();
    });
  }

  protected keep(): void {
    if (!this.busy()) {
      this.dialogRef.close();
    }
  }

  protected async remove(): Promise<void> {
    this.state.set('busy');
    const outcome = await this.data.confirm();
    if (outcome === 'failed') {
      this.state.set('failed');
    } else {
      this.dialogRef.close(outcome);
    }
  }
}
