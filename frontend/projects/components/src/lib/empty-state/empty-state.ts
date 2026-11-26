import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * Nothing to show (docs/design-system/components/empty-state.html): `nothing` when nothing is
 * there yet or nothing was found, with the ways forward the consumer projects; `error` when
 * nothing could be loaded, with its warning icon and "Try again". Each says what happened in a
 * sentence and offers one way forward.
 */
@Component({
  selector: 'cr-empty-state',
  imports: [Icon, NgTemplateOutlet],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly variant = input<'nothing' | 'error'>('nothing');
  readonly title = input.required<string>();
  readonly text = input.required<string>();

  protected readonly titleId = `empty-state-title-${nextId++}`;
}
