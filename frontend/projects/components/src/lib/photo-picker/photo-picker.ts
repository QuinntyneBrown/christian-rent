import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { PickerPhoto } from '@rent/api';
import { Icon } from '../icon/icon';
import { Spinner } from '../spinner/spinner';
import { Tag } from '../tag/tag';

/**
 * The photos of a listing for rent (docs/design-system/components/photo-picker.html; L2-013;
 * ADR 0021): a group named "Photos" with how many are in of the most, a thumbnail for each with
 * a Remove button named by its position (Cancel upload while it uploads), "On the card" on the
 * first, the Add tile that opens the file chooser for one file, and the rules as help. With
 * every place taken, Add is off and the help says to remove one. A problem with a chosen file
 * shows in place of the help, as an alert.
 */
@Component({
  selector: 'cr-photo-picker',
  imports: [Icon, Spinner, Tag],
  templateUrl: './photo-picker.html',
  styleUrl: './photo-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPicker {
  /** The group label's id, unique on the page. */
  readonly fieldId = input.required<string>();
  /** The photos in order: those that are in, then those still uploading. */
  readonly photos = input<readonly PickerPhoto[]>([]);
  readonly max = input(6);
  /** What went wrong with the last file chosen, as text, or null. */
  readonly problem = input<string | null>(null);
  /** While the listing is sent, nothing can be added or removed. */
  readonly disabled = input(false);
  /** A file the member chose. */
  readonly chosen = output<File>();
  /** The key of a photo to remove, or whose upload to cancel. */
  readonly remove = output<string>();

  protected readonly added = computed(
    () => this.photos().filter((photo) => !photo.uploading).length,
  );
  protected readonly full = computed(() => this.photos().length >= this.max());

  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('file');

  protected choose(): void {
    this.input().nativeElement.click();
  }

  protected picked(): void {
    const element = this.input().nativeElement;
    const file = element.files?.[0];
    // Cleared, so choosing the same file again is a new choice.
    element.value = '';
    if (file) {
      this.chosen.emit(file);
    }
  }
}
