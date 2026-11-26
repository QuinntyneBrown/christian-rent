import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Post's two columns (docs/design-system/foundations/layout.html, `post-layout`): the form,
 * with the consumer's fields, its actions (`slot="actions"`) and the fine print under them, and
 * the live preview (`slot="preview"`) under a heading in an aside. The preview sits under the
 * form below 768 px and beside it, sticky, from 768 px (L2-031, criterion 4). Submitting emits
 * `submitted` and never reloads the page; `busy` marks the form while a listing is sent.
 */
@Component({
  selector: 'cr-post-layout',
  templateUrl: './post-layout.html',
  styleUrl: './post-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostLayout {
  /** What the member is told before submitting (L2-012, criterion 7). */
  readonly fine = input.required<string>();
  readonly previewLabel = input.required<string>();
  readonly busy = input(false);
  readonly submitted = output<void>();

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
