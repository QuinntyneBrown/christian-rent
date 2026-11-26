# 0021. What uploading photos does where its design left it open

**Status:** Accepted. Supplements [0011](0011-photo-renditions-and-serving.md), whose renditions
it keeps, and settles the photos field that [0019](0019-posting-open-decisions.md) left disabled.
[0004](0004-file-storage.md) stays Open on the production file storage.

## Context

The add-photos design and the Post mocks leave open what journey 7 has to settle:

- the image library behind `IPhotoInspector` and `IPhotoProcessor` (`<TO SUPPLY>`);
- the pixel size and the format of each rendition (`<TO SUPPLY>`; ADR 0011 chose them for
  serving, before anything made them);
- how long an unattached photo is kept before it is deleted (`<TO SUPPLY>`);
- the control that reorders photos: L2-013, criterion 2 names reordering, and no mock draws a
  control for it;
- how a refusal is answered, and how large a request may be;
- who may read, delete and post an unattached photo, and what a photo's text alternative is;
- what Post does with several files at once, with a photo still uploading, with a photo that
  cannot be sent because christian.rent cannot be reached, and with the photos of a listing
  that becomes wanted.

## Decision

- **The image library.** `SkiaSharp` 4.156 (MIT), with
  `SkiaSharp.NativeAssets.Linux.NoDependencies` so the Linux natives need no system libraries,
  behind `IPhotoInspector` and `IPhotoProcessor` in `ChristianRent.Infrastructure`. Skia is the
  decoder browsers use on the same untrusted images, and it is kept up to date by Microsoft.
  `SixLabors.ImageSharp` was tried first and set aside: from 3.2 and 4.0 it refuses a Release
  build without a Six Labors licence key, a registered credential outside the repository, even
  for open-source use.
- **Inspection.** `SkiaPhotoInspector` identifies the content from its header alone
  (`SKCodec`, which reads no pixels), never from the file name or the declared type (L2-014,
  criterion 1). JPEG, PNG and WebP are accepted; anything else, another image format included,
  is refused, as is content that is not an image.
- **The rules, in order.** `PhotoRules.Check` refuses, first match wins: more than 10 MB
  (`photo_too_large`), not a JPEG, PNG or WebP (`photo_type_refused`), more than 8,000 px on
  either side (`photo_dimensions_too_large`), less than 400 × 300 px either way round, that is a
  longer side under 400 or a shorter side under 300 (`photo_too_small`), so a photo taken
  upright meets the same limits as one taken sideways. The length is checked before the content
  is read, and the dimensions before the pixels are decoded.
- **Renditions.** As ADR 0011: `card` 800 × 600, `gallery` 1600 × 1200 and `thumb` 240 × 180,
  each a JPEG at quality 82, made by turning the photo upright from its EXIF orientation and then
  cropping it from the centre to fill the 4:3 box on white (scaled up when it is smaller). Only
  the first frame of an animated image is used. Skia's encoder writes no metadata, so the EXIF
  block with its GPS position and every other embedded profile are left behind (L2-014,
  criterion 3). The original file is not stored.
- **Memory.** A photo up to 8,000 × 8,000 px decodes to about 256 MB, so each API instance
  processes at most 2 photos at a time; a third waits for one of them.
- **Refusals.** A refused photo is answered 400 with a ProblemDetails whose `code` is the rule's,
  the same shape as every other refused request here. `POST /api/photos` takes one multipart
  field, `file`, and a request body of at most 10 MB plus 64 KiB for the form; the server
  answers a longer body 413 before the handler sees it.
- **Who may do what.** Uploading needs a member (`not_a_member` otherwise). A photo no posted
  listing names is its uploader's alone: only they may read it (`private, no-store`) or delete it
  (`DELETE /api/photos/{id}`, 204). Anyone else, an admin included, is answered `not_found`, as is
  the uploader for a photo a listing already names (L2-025, criterion 2). A photo of a listing
  waiting for review is served to the listing's poster and to an admin, privately; a photo of an
  approved listing to anyone, as ADR 0011 says.
- **Posting with photos.** `POST /api/listings` takes up to 6 `photoIds` for a listing for rent,
  none for a wanted one, each once. Each must be the member's own photo that no listing names;
  otherwise the request is refused with `validation_failed` on `photoIds` and nothing is saved.
  The photos are kept in the order sent, the first on the card.
- **Unattached photos.** A photo no posted listing names is kept 24 hours, which outlasts any
  draft that is still being written. `ChristianRent.Cli purge-photos`, run hourly, deletes every
  unattached photo uploaded more than 24 hours ago, its files first and then its row; running it
  again changes nothing. A photo that was still uploading when the member left Post is one of
  these (L2-013, criterion 5).
- **Reordering.** Not built. The photos stay in the order they were added until a mock draws a
  control for moving them; L2-013, criterion 2 says so. Removing a photo is built.
- **The text alternative.** Who writes a photo's description is still open (ADR 0016); an uploaded
  photo has none. In the picker its text alternative is "Photo {n}", and while it uploads
  "Photo {n}, uploading".
- **On Post.**
  - The Add tile chooses one file at a time. A photo counts towards the 6 from the moment it is
    chosen, so Add is off while 6 are added or uploading; the count, "1 of 6", is of the photos
    that are in.
  - While a photo uploads, its thumbnail is an object URL of the chosen file. Once it is in, the
    thumbnail is its `thumb` rendition and the preview's photo its `card` rendition, both from
    the API, and the object URL is revoked. Removing a photo that is in deletes it on the
    backend; cancelling one that is uploading aborts the request. Leaving Post aborts every
    upload and revokes every object URL. Publishing posts the photos that are in and cancels
    any still uploading, so nothing joins a draft that has been sent.
  - A refusal (any `photo_*` code, a 400 or a 413) shows the refusal message with the file's name
    and the limits (L2-014, criterion 6). A failure to reach christian.rent (status 0 or 5xx)
    shows "“{file}” wasn’t added. We couldn’t reach christian.rent. Try adding it again."
    (L2-013, criterion 8). Either message goes when another photo is chosen or one is removed.
  - The draft keeps the photos that are in (their identifiers and addresses) in `sessionStorage`
    with the rest of the draft (ADR 0019); a photo still uploading is not kept.
  - Switching to "need" hides the photos field and keeps the photos in the draft, so switching
    back to "have" shows them again; a wanted listing is posted, and previewed, with none
    (L2-013, criterion 9).
  - The picker is part of Post's lazily loaded chunk; nothing about photos is in the initial
    bundle (L2-029, criterion 2).

## Consequences

- `Photo` (`ChristianRent.Domain`) is a new table: the photo's identifier, its uploader, the
  listing that names it, if any, its dimensions and when it was uploaded. The renditions' keys
  follow from its identifier (ADR 0011), so none is stored. Photos the seed data enters have no
  `Photo` row; they are served by the listing that names them.
- An operator schedules `purge-photos` hourly beside the daily `purge-departed`; the README's
  settings and commands say so.
- A member can upload 30 photos a minute within the write limit (L2-027) and keep them for
  24 hours. If that proves too generous, a limit on unattached photos per member is the next step.
- A rendition in WebP or AVIF can follow behind the same names, as ADR 0011 foresaw.
- Reordering needs its mock, then the criterion, the design and a slice.
- Skia is native code: a SkiaSharp update is taken promptly when it fixes a decoder, and the
  API's image runs on Linux with the bundled natives.
