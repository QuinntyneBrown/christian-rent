import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon, type IconName } from '../icon/icon';

/**
 * A short task over the page (docs/design-system/components/dialog.html): the backdrop, and the
 * panel with its title (an `h2`), its description, Close, the body and the footer. It is the
 * presentation only: the CDK `Dialog` that opens it holds focus inside, closes on Escape and
 * returns focus (L2-032, criterion 9). Under 640 px the panel is a bottom sheet.
 *
 * Project the body as content and each footer button with `slot="footer"`.
 */
@Component({
  selector: 'cr-dialog',
  imports: [Button, Icon],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  /** The title's id, which the dialog is labelled by. */
  readonly titleId = input.required<string>();
  readonly title = input.required<string>();
  /** The description's id, which the dialog is described by. */
  readonly descriptionId = input<string | null>(null);
  readonly description = input<string | null>(null);
  /** Decoration before the title, in a round tinted badge. */
  readonly icon = input<IconName | null>(null);
  /** The badge's tone: danger for a confirmation that removes something. */
  readonly tone = input<'info' | 'danger'>('info');
  /** While a request is in flight, Close does nothing. */
  readonly closeDisabled = input(false);

  /** Close was pressed. */
  readonly closed = output();

  protected close(): void {
    if (!this.closeDisabled()) {
      this.closed.emit();
    }
  }
}
