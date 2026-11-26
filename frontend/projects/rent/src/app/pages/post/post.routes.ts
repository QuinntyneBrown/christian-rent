import type { Routes } from '@angular/router';
import { PostPage } from './post-page';

/** Post's route: its page and store load only when Post is opened (L2-029, criterion 2). */
export default [
  {
    path: '',
    component: PostPage,
  },
] satisfies Routes;
