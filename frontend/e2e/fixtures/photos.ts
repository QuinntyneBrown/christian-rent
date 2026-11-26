import { join } from 'node:path';
import type { ApiFixtures } from './api';

/** How many photos each spec's fixtures have answered. */
const uploads = new WeakMap<ApiFixtures, number>();

/** The identifiers `POST /api/photos` answers, in the order photos are uploaded. */
export const UPLOADED_IDS = [1, 2, 3, 4, 5, 6, 7, 8].map(
  (n) => `f070a11d-0007-4000-8000-${String(n).padStart(12, '0')}`,
);

/** A file a spec chooses on Post, from the mocks' photos, served from localhost. */
export function photoFile(name = 'tools.jpg'): string {
  return join(__dirname, 'photos', name);
}

/**
 * Uploading as the backend answers it (add-photos design): 201 with the photo's identifier and
 * the addresses of its renditions, which are then served from localhost, and 204 for deleting
 * it. Each upload answers the next identifier of `UPLOADED_IDS`, counted across the spec, so a
 * spec that answers uploads again after a refusal goes on from where it was.
 */
export function answerUploads(api: ApiFixtures): void {
  api.answer('POST', '/api/photos', () => {
    const uploaded = uploads.get(api) ?? 0;
    uploads.set(api, uploaded + 1);
    const id = UPLOADED_IDS[uploaded];
    if (id === undefined) {
      return { status: 500 };
    }
    for (const rendition of ['card', 'gallery', 'thumb']) {
      api.answer('GET', `/api/photos/${id}/${rendition}`, {
        path: photoFile(),
        headers: { 'content-type': 'image/jpeg' },
      });
    }
    api.answer('DELETE', `/api/photos/${id}`, { status: 204 });
    return { status: 201, body: { id, urls: urlsOf(id) } };
  });
}

/** The addresses of a photo's renditions, as the API answers them. */
export function urlsOf(id: string): { card: string; gallery: string; thumb: string } {
  return {
    card: `/api/photos/${id}/card`,
    gallery: `/api/photos/${id}/gallery`,
    thumb: `/api/photos/${id}/thumb`,
  };
}
