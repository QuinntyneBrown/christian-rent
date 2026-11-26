import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One option of the switch: its words, the address it leads to, and its count as text. */
export interface SegmentedOption {
  readonly label: string;
  /** The query parameters of the address the option shows, on the same screen. */
  readonly queryParams: Readonly<Record<string, string>>;
  readonly current: boolean;
  /** The count, formatted; null while the list loads or has failed (L2-002, criterion 6). */
  readonly count: string | null;
}

/**
 * Browse's switch between Everything, For rent and Wanted
 * (docs/design-system/components/segmented.html). Each option is a link to the same screen
 * with its choice in the address, so the back button and a shared link restore it; the
 * chosen one is `aria-current="true"` (L2-032, criterion 3). The count is read with the
 * option's words: "For rent 4".
 */
@Component({
  selector: 'cr-segmented',
  imports: [RouterLink],
  templateUrl: './segmented.html',
  styleUrl: './segmented.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Segmented {
  /** The name of the navigation, "Show" on Browse. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly SegmentedOption[]>();
}
