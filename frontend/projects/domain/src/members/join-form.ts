import type { JoinRequest } from '@rent/api';

/** The church field's value for "My church isn't listed". */
export const NEW_CHURCH = 'new';

/**
 * What the join dialog holds (L2-017): the name, the church (a church's identifier,
 * `NEW_CHURCH`, or empty for none chosen), the new church's name and city, and the declaration.
 */
export interface JoinForm {
  readonly name: string;
  readonly church: string;
  readonly newChurchName: string;
  readonly newChurchCity: string;
  readonly declaresChristian: boolean;
}

export type JoinField = keyof JoinForm;

/** The message of each invalid field; a field that is valid has none. */
export type JoinFormErrors = Partial<Record<JoinField, string>>;

/** The limits of L2-017 criterion 6 and ADR 0018, as the backend counts them. */
export const JOIN_LIMITS = { name: 60, newChurchName: 100, newChurchCity: 80 } as const;

const MESSAGES: Record<JoinField, string> = {
  name: 'Enter your name, up to 60 characters.',
  church: 'Choose your church, or choose “My church isn’t listed”.',
  newChurchName: 'Enter your church’s name, up to 100 characters.',
  newChurchCity: 'Enter your church’s city, up to 80 characters.',
  declaresChristian: 'Tick the box to declare that you are a Christian.',
};

/**
 * The rules of joining (become-member design, `JoinFormValidator`): a name of 1 to 60
 * characters; a chosen church, or a new one with a name of 1 to 100 and a city of 1 to 80; and
 * the declaration (L2-017, criteria 1, 2 and 6). Lengths count the text as it is sent.
 */
export function validateJoinForm(form: JoinForm): JoinFormErrors {
  const errors: JoinFormErrors = {};
  if (!within(form.name, JOIN_LIMITS.name)) {
    errors.name = MESSAGES.name;
  }
  if (form.church === '') {
    errors.church = MESSAGES.church;
  } else if (form.church === NEW_CHURCH) {
    if (!within(form.newChurchName, JOIN_LIMITS.newChurchName)) {
      errors.newChurchName = MESSAGES.newChurchName;
    }
    if (!within(form.newChurchCity, JOIN_LIMITS.newChurchCity)) {
      errors.newChurchCity = MESSAGES.newChurchCity;
    }
  }
  if (!form.declaresChristian) {
    errors.declaresChristian = MESSAGES.declaresChristian;
  }
  return errors;
}

/** What is sent to join: the text cleaned, and one church, never both. */
export function toJoinRequest(form: JoinForm): JoinRequest {
  const isNew = form.church === NEW_CHURCH;
  return {
    name: clean(form.name),
    churchId: isNew ? null : form.church,
    newChurchName: isNew ? clean(form.newChurchName) : null,
    newChurchCity: isNew ? clean(form.newChurchCity) : null,
    declaresChristian: form.declaresChristian,
  };
}

/** Trimmed, single-spaced, in Unicode form C, as the backend cleans it (handle-member-data design). */
function clean(text: string): string {
  return text.normalize('NFC').trim().split(/\s+/).filter(Boolean).join(' ');
}

function within(text: string, max: number): boolean {
  const length = clean(text).length;
  return length > 0 && length <= max;
}
