import type { ApiError } from '@rent/api';
import { photoProblemOf, photoProblemText } from './photo-problem';

const error = (status: number, code: string | null): ApiError => ({
  status,
  code,
  retryAt: null,
  fields: null,
});

// add-photos design; L2-013 criterion 8; L2-014 criterion 6; ADR 0021.
describe('photoProblemOf', () => {
  it.each([
    ['a refused type', error(400, 'photo_type_refused'), 'refused'],
    ['a photo that is too small', error(400, 'photo_too_small'), 'refused'],
    ['a body too large for the server', error(413, null), 'refused'],
    ['christian.rent not reached', error(0, null), 'unreachable'],
    ['a failure on the backend', error(503, null), 'unreachable'],
    ['something that is not an ApiError', new Error('boom'), 'unreachable'],
  ])('reads %s as %s', (_, failure, reason) => {
    expect(photoProblemOf('hall.jpg', failure)).toEqual({ file: 'hall.jpg', reason });
  });
});

describe('photoProblemText', () => {
  it('names the file and every limit of a refused photo', () => {
    expect(photoProblemText({ file: 'garage-raw.tiff', reason: 'refused' })).toBe(
      '“garage-raw.tiff” wasn’t added. A photo must be a JPEG, PNG or WebP of 10 MB or less, at least 400 × 300 px and at most 8,000 px on a side.',
    );
  });

  it('names the file and says to try again when christian.rent was not reached', () => {
    expect(photoProblemText({ file: 'hall.jpg', reason: 'unreachable' })).toBe(
      '“hall.jpg” wasn’t added. We couldn’t reach christian.rent. Try adding it again.',
    );
  });
});
