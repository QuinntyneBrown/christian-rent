import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The mark, a key whose head is a cross, and the lowercase wordmark with ".rent" in orange.
 * The wordmark is a constant in the template: no input can change its text or case (L2-023).
 * The link leads to `/`, home in either application: Browse in `rent`, the review queue in Admin
 * (L2-036, criteria 1 and 4). Its accessible name says which.
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
  /** The link's accessible name. */
  readonly label = input('christian.rent home');
}
