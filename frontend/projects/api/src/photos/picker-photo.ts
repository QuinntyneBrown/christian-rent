/**
 * A photo as `cr-photo-picker` draws it (add-photos design): its key, the address of its
 * thumbnail (an object URL while it uploads), and whether it is still uploading.
 */
export interface PickerPhoto {
  readonly key: string;
  readonly url: string;
  readonly uploading: boolean;
}
