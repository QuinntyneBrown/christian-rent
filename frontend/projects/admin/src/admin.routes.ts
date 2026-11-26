import type { Routes } from '@angular/router';
import { ReviewPage } from './review/review-page';

/**
 * Admin's routes. `rent` loads them behind its admin guard, so none of this library is sent to
 * anyone else (L2-018, criterion 3). They bind what Admin alone uses.
 */
export const ADMIN_ROUTES: Routes = [{ path: '', component: ReviewPage }];
