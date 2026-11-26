// Acceptance Test
// Traces to: L2-011, L2-013, L2-014, L2-029
// Description: A member adds a photo to a listing for rent: it shows as uploading with a way to cancel, then in the picker marked "On the card" and on the preview's card, and it is posted with the listing.
import { answerMember } from '../fixtures/members';
import { UPLOADED_IDS, answerUploads, photoFile } from '../fixtures/photos';
import { answerPosting } from '../fixtures/post';
import { expect, test } from '../fixtures/test';
import { PostPage } from '../pages/post.page';

test.describe('Post: adding photos', () => {
  test.beforeEach(({ api }) => {
    answerMember(api);
    answerUploads(api);
    answerPosting(api);
  });

  // L2-013 criteria 1, 6 and 7; L2-011: the photo shows at once as uploading, with a status and
  // a cancel button; once in, it is counted, marked "On the card" and drawn on the preview, and
  // the listing is posted with it.
  test('a member adds a photo that uploads, goes on the card and is posted @critical', async ({
    page,
    api,
  }) => {
    const post = new PostPage(page);
    await post.open();
    await post.fillForRent();
    const release = api.hold('POST', '/api/photos');

    await post.choosePhoto(photoFile('tools.jpg'));

    await expect(post.uploading(1)).toBeVisible();
    await expect(post.cancelUpload(1)).toBeVisible();
    await expect(post.photoImages).toHaveAttribute('alt', 'Photo 1, uploading');
    await expect(post.photoImages).toHaveAttribute('src', /^blob:/);
    await expect(post.photosLabel).toHaveText('Photos 0 of 6');
    await expect(post.previewPhoto).toBeVisible();

    release();

    const id = UPLOADED_IDS[0];
    await expect(post.removePhoto(1)).toBeVisible();
    await expect(post.uploading(1)).toHaveCount(0);
    await expect(post.photosLabel).toHaveText('Photos 1 of 6');
    await expect(post.photoImages).toHaveAttribute('alt', 'Photo 1');
    await expect(post.photoImages).toHaveAttribute('src', `/api/photos/${id}/thumb`);
    await expect(post.onTheCard).toHaveText('On the card');
    await expect(post.photosHelp).toHaveText(
      'Up to 6. JPEG, PNG or WebP, 10 MB or less each. The first one is shown on the card.',
    );
    await expect(post.previewPhoto).toHaveCount(0);
    await expect(post.previewImage).toHaveAttribute('src', new RegExp(`/api/photos/${id}/card`));
    await expect(post.previewImage).toHaveJSProperty('complete', true);
    expect(api.bodies.get('POST /api/photos')).toEqual([
      expect.stringMatching(/^multipart\/form-data/),
    ]);

    await post.submit.click();

    await expect(post.heading).toHaveText('Sent for review');
    const [body] = api.bodies.get('POST /api/listings') as [Record<string, unknown>];
    expect(body['photoIds']).toEqual([id]);
  });

  // L2-013 criterion 1: a second photo follows the first, which stays on the card.
  test('a second photo follows the first, which stays on the card', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();

    await post.choosePhoto(photoFile('tools.jpg'));
    await expect(post.removePhoto(1)).toBeVisible();
    await post.choosePhoto(photoFile('hall.jpg'));

    await expect(post.removePhoto(2)).toBeVisible();
    await expect(post.photosLabel).toHaveText('Photos 2 of 6');
    await expect(post.photoImages.nth(0)).toHaveAttribute(
      'src',
      `/api/photos/${UPLOADED_IDS[0]}/thumb`,
    );
    await expect(post.photoImages.nth(1)).toHaveAttribute(
      'src',
      `/api/photos/${UPLOADED_IDS[1]}/thumb`,
    );
    await expect(post.onTheCard).toHaveCount(1);
    await expect(post.photoItems.first().locator('.photo-picker__first')).toBeVisible();
    await expect(post.previewImage).toHaveAttribute(
      'src',
      new RegExp(`/api/photos/${UPLOADED_IDS[0]}/card`),
    );
  });

  // ADR 0019 and 0021: the photos that are in are kept with the draft across a reload.
  test('the photos that are in are kept with the draft when Post is reloaded', async ({ page }) => {
    const post = new PostPage(page);
    await post.open();
    await post.choosePhoto(photoFile('tools.jpg'));
    await expect(post.removePhoto(1)).toBeVisible();

    await page.reload();

    await expect(post.removePhoto(1)).toBeVisible();
    await expect(post.photosLabel).toHaveText('Photos 1 of 6');
    await expect(post.photoImages).toHaveAttribute('src', `/api/photos/${UPLOADED_IDS[0]}/thumb`);
  });
});
