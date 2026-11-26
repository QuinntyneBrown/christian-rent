import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SESSION } from '@rent/api';
import { Button, PlainPage, SiteHeader } from '@rent/components';

/** An address that matches no screen: "not found", with a way back to Browse (L2-033, criterion 3). */
@Component({
  selector: 'cr-not-found-page',
  imports: [Button, PlainPage, RouterLink, SiteHeader],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  protected readonly member = inject(SESSION).member;
}
