import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Injector, afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, skip } from 'rxjs';

/**
 * After each navigation but the first, moves focus to the new page's <h1>, so keyboard and
 * screen-reader users start at the top of the new screen (L2-032, criterion 2). The first load
 * leaves focus alone, so the skip link stays the first control (criterion 8).
 */
@Injectable({ providedIn: 'root' })
export class PageFocus {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  start(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        afterNextRender(
          () => this.document.querySelector<HTMLElement>('main h1[tabindex="-1"]')?.focus(),
          { injector: this.injector },
        );
      });
  }
}
