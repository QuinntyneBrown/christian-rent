import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Where a tag sits decides its colours (docs/design-system/components/tag.html): on a listing
 * card's photo, on a wanted card's blue panel, or marking an item in the review queue.
 */
export type TagVariant = 'default' | 'on-photo' | 'on-wanted' | 'new' | 'reported' | 'new-member';

/** A short label in a pill: a listing's kind, "Wanted · space", "New listing". Text, never colour alone. */
@Component({
  selector: 'cr-tag',
  templateUrl: './tag.html',
  styleUrl: './tag.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tag {
  readonly variant = input<TagVariant>('default');
  readonly large = input(false);
}
