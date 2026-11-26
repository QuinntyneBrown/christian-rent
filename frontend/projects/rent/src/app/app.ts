import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SkipLink, Toast, ToastRegion } from '@rent/components';
import { ClientErrors } from './shell/client-errors';

/** The shell: the skip link, the page the route loads, and the region toasts rise into. */
@Component({
  selector: 'cr-root',
  imports: [RouterOutlet, SkipLink, Toast, ToastRegion],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly clientErrors = inject(ClientErrors);
  private readonly document = inject(DOCUMENT);

  protected reload(): void {
    this.document.location.reload();
  }
}
