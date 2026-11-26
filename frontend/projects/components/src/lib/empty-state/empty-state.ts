import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * Nothing to show (docs/design-system/components/empty-state.html): `nothing` when nothing is
 * there yet or nothing was found, with the ways forward the consumer projects; `error` when
 * nothing could be loaded, with its warning icon and "Try again"; `done` when there is nothing
 * left to do, with its tick. Each says what happened in a sentence, and the first two offer a
 * way forward.
 */
@Component({
  selector: 'cr-empty-state',
  imports: [Icon, NgTemplateOutlet],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly variant = input<'nothing' | 'error' | 'done'>('nothing');
  /** Announces an error that appears after an action, as in a panel beside what stays. */
  readonly announce = input(false);
  readonly title = input.required<string>();
  readonly text = input.required<string>();

  protected readonly titleId = `empty-state-title-${nextId++}`;
}
