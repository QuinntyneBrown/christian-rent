import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Two fields that share a row (docs/design-system/components/layout.html, `field-row`): side by
 * side from 576 px to 767 px and from 992 px, stacked otherwise.
 */
@Component({
  selector: 'cr-field-row',
  templateUrl: './field-row.html',
  styleUrl: './field-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldRow {}
