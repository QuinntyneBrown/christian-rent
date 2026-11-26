# 0011. Photo renditions and how they are served

**Status:** Accepted. Supplements [0004](0004-file-storage.md), which stays Open on the production
product.

## Context

Browse shows each listing for rent with its first photo, sized to the card, with its space
reserved before it loads (L2-029, criterion 3). Photos are served from file storage, never from
the database, and a photo of a listing that is not approved is not served to the public (L2-014;
`AGENTS.md`). The add-photos design leaves the pixel size and the format of each rendition, and
the image library that makes them, `<TO SUPPLY>`. Uploading is journey 7; Browse (journey 2)
needs to read and serve renditions first.

## Decision

- **Renditions.** Every photo is stored as three renditions, each a JPEG cropped to fill a 4:3
  box: `card` 800 × 600, `gallery` 1600 × 1200 and `thumb` 240 × 180. The card box on Browse is
  4:3, so the card rendition fills it without a second crop. JPEG decodes everywhere; a smaller
  format (WebP, AVIF) can follow once the image library is chosen, behind the same names.
- **Keys.** A rendition's storage key is `{photoId:N}/{rendition}.jpg`. The database holds the
  photo's identifier, its position and its description, never its bytes.
- **Storage seam.** `IPhotoStorage` gains `SaveAsync(key, content)` and `OpenReadAsync(key)`,
  which answers null when the key holds nothing. `LocalDiskPhotoStorage` keeps them under
  `PhotoStorage:RootPath` and refuses a key that would leave that directory.
- **Serving.** `GET /api/photos/{id}/{rendition}` is `[AllowAnonymous]`. `GetPhotoQueryHandler`
  serves a rendition only when the photo belongs to an approved listing whose poster is not
  removed, with `Cache-Control: public, max-age=31536000, immutable` (a rendition never changes:
  a new photo has a new identifier). Anything else, an unknown rendition name included, answers
  404 `not_found`, which reveals nothing. Journey 7 adds serving to the photo's owner and to an
  admin.
- **Producing renditions.** Until journey 7 chooses the image library, nothing in the API makes
  renditions. `ChristianRent.Cli seed` writes the sample listings' `card` renditions, made once
  from the mocks' photos and embedded in `ChristianRent.Infrastructure`.
- **The browser.** A card's photo goes through `NgOptimizedImage` with `width="800"`
  `height="600"`; the cards in the first row are `priority`, the rest load lazily.

## Consequences

- Journey 7 adds `IPhotoProcessor`, which must produce exactly these three renditions.
- A seeded listing has no `gallery` or `thumb` rendition until journey 4 needs them; that
  journey seeds them from the same sources.
- Photos come from the API's own origin, so the CSP's `img-src 'self'` already allows them.
