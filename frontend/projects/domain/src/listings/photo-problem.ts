import { isApiError } from '@rent/api';

/**
 * Why a chosen file was not added (ADR 0021): the backend refused it, or christian.rent could
 * not be reached.
 */
export type PhotoProblemReason = 'refused' | 'unreachable';

/** A file that was not added, by its name as the member chose it. */
export interface PhotoProblem {
  readonly file: string;
  readonly reason: PhotoProblemReason;
}

/**
 * Reads a failed upload (L2-014, criterion 6; L2-013, criterion 8): a 4xx answer is a refusal,
 * whatever its code; no answer, a 5xx or anything else is "not reached".
 */
export function photoProblemOf(file: string, failure: unknown): PhotoProblem {
  const refused = isApiError(failure) && failure.status >= 400 && failure.status < 500;
  return { file, reason: refused ? 'refused' : 'unreachable' };
}

/** What the photos field says: the file by its name, and the limits or the advice. */
export function photoProblemText(problem: PhotoProblem): string {
  const added = `“${problem.file}” wasn’t added.`;
  return problem.reason === 'refused'
    ? `${added} A photo must be a JPEG, PNG or WebP of 10 MB or less, at least 400 × 300 px and at most 8,000 px on a side.`
    : `${added} We couldn’t reach christian.rent. Try adding it again.`;
}
