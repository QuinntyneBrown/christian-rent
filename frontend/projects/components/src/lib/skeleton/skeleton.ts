import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A line of text, a heading, a circle, or a box such as a photo's (fills its container). */
export type SkeletonShape = 'text' | 'title' | 'circle' | 'rect' | 'fill';

/**
 * A grey shape where content is about to be (docs/design-system/components/skeleton.html). It is
 * decoration: the screen announces what it is waiting for in its own status line. Reduced motion
 * stops the shimmer.
 */
@Component({
  selector: 'cr-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class.skeleton-host--fill]': "shape() === 'fill'",
    '[style.inline-size.%]': 'width()',
  },
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('text');
  /** Its width as a share of its container, in per cent; lines of different lengths look like text. */
  readonly width = input<number | null>(null);
}
