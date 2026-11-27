// Acceptance Test
// Traces to: L2-009, L2-013, L2-014
// Description: The photos field refuses a file with its name and the limits, says when christian.rent could not be reached, turns Add off at 6, removes a photo and cancels an upload, releases every upload and object URL when Post is left, and keeps the photos through a switch to wanted.
import type { Page } from '@playwright/test';
import { answerNoListings } from '../../fixtures/listings';
import { answerMember } from '../../fixtures/members';
import { UPLOADED_IDS, answerUploads, photoFile } from '../../fixtures/photos';
import { answerPosting } from '../../fixtures/post';
import { expect, test } from '../../fixtures/test';
import { PostPage } from '../../pages/post.page';

const REFUSED =
  '“garage-raw.tiff” wasn’t added. A photo must be a JPEG, PNG or WebP of 10 MB or less, at least 400 × 300 px and at most 8,000 px on a side.';

/** A file as the member's device names it, with any content. */
function file(name: string): { name: string; mimeType: string; buffer: Buffer } {
  return { name, mimeType: 'image/tiff', buffer: Buffer.from('II*\u0000') };
}

/** Whether the page can still read what an object URL points at. */
function readable(page: Page, url: string): Promise<boolean> {
  return page.evaluate(
    (address) =>
      fetch(address).then(
        () => true,
        () => false,
      ),
    url,
  );
}

/** Adds photos one after the other, each waiting until it is in. */
async function addPhotos(post: PostPage, count: number): Promise<void> {
  for (let n = 1; n <= count; n++) {
    await post.choosePhoto(photoFile());
    await expect(post.removePhoto(n)).toBeVisible();
  }
}

test.describe('Post: the states of the photos field', () => {
  test.beforeEach(({ api }) => {
    answerMember(api);
    answerUploads(api);
    answerPosting(api);
  });

  // L2-014 criteria 1, 2 and 6: a refused file is named with every limit, as an alert; the
  // photos already added stay; the next choice clears it.
  test('a refused file is named with the limits and the photos already added stay', async ({
    page,
    api,
  }) => {
    const post = new PostPage(page);
    await post.open();
    await addPhotos(post, 1);
    api.refuse('POST', '/api/photos', 400, 'photo_type_refused');

    await post.choosePhoto(file('garage-raw.tiff'));

    await expect(post.photosError).toHaveText(REFUSED);
    await expect(post.photosError).toHaveAttribute('role', 'alert');
    await expect(post.photosHelp).toHaveCount(0);
    await expect(post.photoItems).toHaveCount(1);
    await expect(post.photosLabel).toHaveText('Photos 1 of 6');
    await expect(post.onTheCard).toBeVisible();

    answerUploads(api);
    await post.choosePhoto(photoFile('hall.jpg'));

    await expect(post.photosError).toHaveCount(0);
    await expect(post.removePhoto(2)).toBeVisible();
  });

  // L2-013 criterion 8: christian.rent not reached is said plainly, with the file's name.
  test('a file that could not be sent is named with the advice to try again', async ({
    page,
    api,
  }) => {
    const post = new PostPage(page);
    await post.open();
    api.answer('POST', '/api/photos', { status: 503 });

    await post.choosePhoto(photoFile('hall.jpg'));

    await expect(post.photosError).toHaveText(
      '“hall.jpg” wasn’t added. We couldn’t reach christian.rent. Try adding it again.',
    );
    await expect(post.photoItems).toHaveCount(0);
    await expect(post.photosLabel).toHaveText('Photos 0 of 6');
  });

  // L2-013 criteria 2, 3 and 6: with 6 photos Add is off and the help says to remove one;
  // removing one deletes it on the backend, keeps the order and turns Add on again.
  test('six photos turn Add off; removing one turns it on and deletes it', async ({
    page,
    api,
  }) => {
    const post = new PostPage(page);
    await post.open();

    await addPhotos(post, 6);

    await expect(post.photosLabel).toHaveText('Photos 6 of 6');
    await expect(post.addPhoto).toBeDisabled();
    await expect(post.photosHelp).toHaveText('That’s all 6 photos. Remove one to add another.');
    await expect(post.photosHelp).toHaveAttribute('role', 'status');

    await post.removePhoto(3).click();

    await expect(post.photosLabel).toHaveText('Photos 5 of 6');
    await expect(post.addPhoto).toBeEnabled();
    await expect(post.photoImages.nth(2)).toHaveAttribute(
      'src',
      `/api/photos/${UPLOADED_IDS[3]}/thumb`,
    );
    await expect.poll(() => api.requests).toContain(`DELETE /api/photos/${UPLOADED_IDS[2]}`);
  });

  // L2-013 criterion 2: removing the first photo puts the next on the card and the preview.
  test('removing the first photo puts the next one on the card', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();
    await addPhotos(post, 2);

    await post.removePhoto(1).click();

    await expect(post.photoItems).toHaveCount(1);
    await expect(post.onTheCard).toBeVisible();
    await expect(post.previewImage).toHaveAttribute(
      'src',
      new RegExp(`/api/photos/${UPLOADED_IDS[1]}/card`),
    );

    await post.removePhoto(1).click();

    await expect(post.photoItems).toHaveCount(0);
    await expect(post.previewPhoto).toBeVisible();
  });

  // L2-013 criterion 7; AGENTS.md: cancelling an upload drops the photo and revokes its URL.
  test('cancelling an upload drops the photo and releases its object URL', async ({
    page,
    api,
  }) => {
    const post = new PostPage(page);
    await post.open();
    const release = api.hold('POST', '/api/photos');
    await post.choosePhoto(photoFile());
    const url = (await post.photoImages.getAttribute('src')) ?? '';
    expect(await readable(page, url)).toBe(true);

    await post.cancelUpload(1).click();

    await expect(post.photoItems).toHaveCount(0);
    expect(await readable(page, url)).toBe(false);
    release();
    await expect(post.photoItems).toHaveCount(0);
    await expect(post.photosError).toHaveCount(0);
  });

  // L2-013 criterion 5; AGENTS.md, Release everything you acquire: leaving Post aborts the
  // upload in flight and revokes its object URL.
  test('leaving Post while a photo uploads cancels it and releases its object URL', async ({
    page,
    api,
  }) => {
    answerNoListings(api);
    const post = new PostPage(page);
    await post.open();
    const release = api.hold('POST', '/api/photos');
    const aborted = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith('/api/photos'),
    );
    await post.choosePhoto(photoFile());
    const url = (await post.photoImages.getAttribute('src')) ?? '';

    await post.header.close.click();

    await expect(page).toHaveURL('/');
    expect((await aborted).failure()?.errorText).toContain('ERR_ABORTED');
    expect(await readable(page, url)).toBe(false);
    release();
  });

  // L2-009 criterion 1; L2-013 criterion 9: "need" removes the photos field and the preview's
  // photo; "have" brings both back; a wanted listing is posted with none.
  test('the photos survive a switch to "need" and back, and a wanted listing sends none', async ({
    page,
    api,
  }) => {
    const post = new PostPage(page);
    await post.open();
    await addPhotos(post, 1);

    await post.need.check();

    await expect(post.photos).toHaveCount(0);
    await expect(post.previewImage).toHaveCount(0);

    await post.have.check();

    await expect(post.removePhoto(1)).toBeVisible();
    await expect(post.previewImage).toBeVisible();

    await post.need.check();
    await post.title.fill('Pressure washer');
    await post.when.fill('Most weekends');
    await post.area.fill('Willoughby, Langley');
    await post.submit.click();

    await expect(post.heading).toHaveText('Sent for review');
    const [body] = api.bodies.get('POST /api/listings') as [Record<string, unknown>];
    expect(body['offer']).toBe('wanted');
    expect(body['photoIds']).toEqual([]);
  });

  // ADR 0021: publishing posts the photos that are in and cancels one still on its way.
  test('publishing while a photo uploads posts the photos that are in', async ({ page, api }) => {
    const post = new PostPage(page);
    await post.open();
    await post.fillForRent();
    await addPhotos(post, 1);
    const release = api.hold('POST', '/api/photos');
    const aborted = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith('/api/photos'),
    );
    await post.choosePhoto(photoFile('hall.jpg'));
    await expect(post.uploading(2)).toBeVisible();

    await post.submit.click();

    await expect(post.heading).toHaveText('Sent for review');
    const [body] = api.bodies.get('POST /api/listings') as [Record<string, unknown>];
    expect(body['photoIds']).toEqual([UPLOADED_IDS[0]]);
    expect((await aborted).failure()?.errorText).toContain('ERR_ABORTED');
    release();
  });
});
