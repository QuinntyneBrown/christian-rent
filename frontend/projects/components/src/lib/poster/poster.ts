import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PosterView } from '@rent/api';
import { Avatar } from '../avatar/avatar';
import { Verified } from '../verified/verified';

/**
 * Who posted a listing (docs/design-system/components/poster.html): their initials, name,
 * church and "Member since 2023" (L2-008, criteria 1 and 6). The member and the church each
 * carry a verified mark only when an admin has confirmed them (criteria 2 to 4). Names are
 * rendered as text.
 */
@Component({
  selector: 'cr-poster',
  imports: [Avatar, Verified],
  templateUrl: './poster.html',
  styleUrl: './poster.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poster {
  readonly poster = input.required<PosterView>();
}
