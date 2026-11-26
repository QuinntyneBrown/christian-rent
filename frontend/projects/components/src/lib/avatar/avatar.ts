import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AvatarTint } from '@rent/api';

/** 32, 40 or 56 px. */
export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * A member's initials on a pale tile (docs/design-system/components/avatar.html). It is
 * decoration: the name is always beside it.
 */
@Component({
  selector: 'cr-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly initials = input.required<string>();
  readonly tint = input<AvatarTint>('sky');
  readonly size = input<AvatarSize>('md');
}
