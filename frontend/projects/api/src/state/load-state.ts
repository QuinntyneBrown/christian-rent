import type { ApiError } from '../errors/api-error';

/**
 * The one shape of every request a screen waits for (fail-clearly-and-operate design). Each
 * route-scoped store exposes one as a signal, beside its screen-specific states.
 */
export type LoadState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly value: T }
  | { readonly status: 'empty' }
  | { readonly status: 'failed'; readonly error: ApiError };
