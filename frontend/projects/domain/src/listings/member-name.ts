import type { AvatarTint } from '@rent/api';

/** Words before a name that are not part of it (docs/design-system/components/avatar.html). */
const TITLES = new Set(['pastor', 'dr.', 'the']);

const TINTS: readonly AvatarTint[] = ['leaf', 'sky', 'sun'];

/** The words of a name, without a leading title; the name itself when it is only a title. */
function words(name: string): string[] {
  const all = name.trim().split(/\s+/).filter(Boolean);
  const named = all.filter((word, index) => index > 0 || !TITLES.has(word.toLowerCase()));
  const rest = all.length > 0 && TITLES.has(all[0]!.toLowerCase()) ? named : all;
  return rest.length > 0 ? rest : all;
}

/** "DW" for "Pastor Dan Whitaker": the first letters of the first two words, skipping a title. */
export function initialsOf(name: string): string {
  return words(name)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]!.toLocaleUpperCase('en-CA'))
    .join('');
}

/** "Dan" for "Pastor Dan Whitaker": the first word that is not a title. */
export function firstNameOf(name: string): string {
  return words(name)[0] ?? name.trim();
}

/**
 * One of the avatar's three tints, from the initials, so a member has the same tint on every
 * screen (ADR 0016).
 */
export function avatarTint(initials: string): AvatarTint {
  const sum = Array.from(initials).reduce((total, letter) => total + letter.codePointAt(0)!, 0);
  return TINTS[sum % TINTS.length]!;
}
