import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, PlainPage } from '@rent/components';

/** An address that matches no screen: "not found", with a way back to Browse (L2-033, criterion 3). */
import { RentHeader } from '../../shell/rent-header';

@Component({
  selector: 'cr-not-found-page',
  imports: [RentHeader, Button, PlainPage, RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
