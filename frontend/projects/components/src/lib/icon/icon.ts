import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The icon set (docs/design-system/foundations/iconography.html). */
export type IconName =
  | 'search'
  | 'pin'
  | 'calendar'
  | 'plus'
  | 'x'
  | 'check'
  | 'arrow-left'
  | 'arrow-right'
  | 'flag'
  | 'badge-check'
  | 'image-plus'
  | 'image'
  | 'inbox'
  | 'logout'
  | 'external'
  | 'alert'
  | 'info'
  | 'check-circle'
  | 'x-circle'
  | 'refresh'
  | 'lock'
  | 'user'
  | 'compass';

/** 16 px beside small text, 20 px by default, 24 px in an empty state, 40 px in a success badge. */
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * A line icon from the set: inline SVG, a 2 px stroke in the colour of the text beside it,
 * bundled with the app. It is decoration (aria-hidden); a button holding only an icon carries
 * the name itself.
 */
@Component({
  selector: 'cr-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');
}
