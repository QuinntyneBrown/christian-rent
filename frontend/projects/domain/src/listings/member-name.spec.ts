import { avatarTint, firstNameOf, initialsOf } from './member-name';

// docs/design-system/components/avatar.html: the first letters of the first two words of the
// name, skipping "Pastor", "Dr." and "The". One case per row.
describe('initialsOf', () => {
  it.each([
    ['Pastor Dan Whitaker', 'DW'],
    ['Marcus Lee', 'ML'],
    ['Dr. Alicia Gomez', 'AG'],
    ['The Okafor family', 'OF'],
    ['Ruth and Caleb Moore', 'RA'],
    ['Bartholomew Oyelaran-Featherstonehaugh', 'BO'],
    ['Cher', 'C'],
    ['  émile   zola ', 'ÉZ'],
    ['Pastor', 'P'],
  ])('writes %s as %s', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});

describe('firstNameOf', () => {
  it.each([
    ['Pastor Dan Whitaker', 'Dan'],
    ['Dr. Alicia Gomez', 'Alicia'],
    ['Marcus Lee', 'Marcus'],
    ['The Okafor family', 'Okafor'],
    ['Pastor', 'Pastor'],
  ])('finds %s’s first name, %s', (name, expected) => {
    expect(firstNameOf(name)).toBe(expected);
  });
});

// ADR 0016: one of three tints from the initials, the same on every screen.
describe('avatarTint', () => {
  it.each([
    ['DW', 'sun'],
    ['ML', 'leaf'],
    ['AG', 'sky'],
    ['BO', 'sky'],
  ] as const)('gives %s the %s tint', (initials, tint) => {
    expect(avatarTint(initials)).toBe(tint);
  });
});
