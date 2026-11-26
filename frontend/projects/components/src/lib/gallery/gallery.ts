import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  input,
  linkedSignal,
  viewChildren,
} from '@angular/core';
import type { GalleryPhotoView } from '@rent/api';
import { Icon } from '../icon/icon';

/**
 * A listing's photos (docs/design-system/components/gallery.html): one large above a row of
 * thumbnails. Each thumbnail is a button named by its position, "Photo 2 of 3", reached by Tab
 * and shown by Enter or a tap; the left and right arrows show the photo before or after and move
 * focus with it (L2-007, criteria 3 and 7). The one shown carries `aria-current`, and a polite
 * live region says which it is. One photo shows alone; none shows "No photo yet" (ADR 0015).
 * The large photo is the screen's largest content, so it loads first.
 */
@Component({
  selector: 'cr-gallery',
  imports: [Icon, NgOptimizedImage],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gallery {
  readonly photos = input.required<readonly GalleryPhotoView[]>();

  /** The photo shown; the first again whenever the photos change. */
  protected readonly index = linkedSignal({ source: this.photos, computation: () => 0 });
  protected readonly current = computed(() => this.photos()[this.index()] ?? null);

  private readonly thumbs = viewChildren<ElementRef<HTMLButtonElement>>('thumb');

  protected show(index: number): void {
    this.index.set(index);
  }

  protected step(event: KeyboardEvent, index: number): void {
    const by = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const next = index + by;
    if (by === 0 || next < 0 || next >= this.photos().length) {
      return;
    }
    event.preventDefault();
    this.index.set(next);
    this.thumbs()[next]?.nativeElement.focus();
  }
}
