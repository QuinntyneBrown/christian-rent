import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The mark, a key whose head is a cross, and the lowercase wordmark with ".rent" in orange.
 * The wordmark is a constant in the template: no input can change its text or case (L2-023).
 * The link leads to Browse (L2-036, criterion 1).
 */
@Component({
  selector: 'cr-logo',
  imports: [RouterLink],
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  /** White text, for the ink rail of Admin. */
  readonly inverse = input(false);
  /**
   * In Admin's rail: the mark alone where the rail is 72 px wide, from 768 to 992 px
   * (docs/design-system/components/admin-nav.html). The link keeps its name.
   */
  readonly rail = input(false);
}
