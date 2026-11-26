import { type JoinForm, NEW_CHURCH, toJoinRequest, validateJoinForm } from './join-form';

const valid: JoinForm = {
  name: 'Sarah Kim',
  church: 'c4a7e1f0-0001-4000-8000-000000000001',
  newChurchName: '',
  newChurchCity: '',
  declaresChristian: true,
};

const newChurch: JoinForm = {
  ...valid,
  church: NEW_CHURCH,
  newChurchName: 'Fort Langley Evangelical Free',
  newChurchCity: 'Fort Langley',
};

// L2-017 criteria 1, 2, 6 and 10; ADR 0018: the rules of the join dialog, one case per row,
// in the words of docs/mocks/dialogs/join/invalid.html.
describe('validateJoinForm', () => {
  it.each([
    ['a name, a church and the declaration', valid, {}],
    ['a new church with its name and city', newChurch, {}],
    ['no name', { ...valid, name: '' }, { name: 'Enter your name, up to 60 characters.' }],
    [
      'a name of spaces',
      { ...valid, name: '   ' },
      { name: 'Enter your name, up to 60 characters.' },
    ],
    ['a name of 60 characters', { ...valid, name: ` ${'a'.repeat(60)} ` }, {}],
    [
      'a name of 61 characters',
      { ...valid, name: 'a'.repeat(61) },
      { name: 'Enter your name, up to 60 characters.' },
    ],
    [
      'no church',
      { ...valid, church: '' },
      { church: 'Choose your church, or choose “My church isn’t listed”.' },
    ],
    [
      'a new church with no name',
      { ...newChurch, newChurchName: ' ' },
      { newChurchName: 'Enter your church’s name, up to 100 characters.' },
    ],
    ['a new church name of 100 characters', { ...newChurch, newChurchName: 'a'.repeat(100) }, {}],
    [
      'a new church name of 101 characters',
      { ...newChurch, newChurchName: 'a'.repeat(101) },
      { newChurchName: 'Enter your church’s name, up to 100 characters.' },
    ],
    [
      'a new church with no city',
      { ...newChurch, newChurchCity: '' },
      { newChurchCity: 'Enter your church’s city, up to 80 characters.' },
    ],
    ['a city of 80 characters', { ...newChurch, newChurchCity: 'a'.repeat(80) }, {}],
    [
      'a city of 81 characters',
      { ...newChurch, newChurchCity: 'a'.repeat(81) },
      { newChurchCity: 'Enter your church’s city, up to 80 characters.' },
    ],
    [
      'an existing church ignores what was typed for a new one',
      { ...valid, newChurchName: 'a'.repeat(101) },
      {},
    ],
    [
      'no declaration',
      { ...valid, declaresChristian: false },
      { declaresChristian: 'Tick the box to declare that you are a Christian.' },
    ],
    [
      'nothing at all',
      { name: '', church: '', newChurchName: '', newChurchCity: '', declaresChristian: false },
      {
        name: 'Enter your name, up to 60 characters.',
        church: 'Choose your church, or choose “My church isn’t listed”.',
        declaresChristian: 'Tick the box to declare that you are a Christian.',
      },
    ],
  ] satisfies [string, JoinForm, object][])('%s', (_case, form, errors) => {
    expect(validateJoinForm(form)).toEqual(errors);
  });
});

// The backend receives the text cleaned as it counts it, and one church, never both.
describe('toJoinRequest', () => {
  it('sends a chosen church by its identifier', () => {
    expect(toJoinRequest({ ...valid, name: '  Sarah   Kim ', newChurchName: 'ignored' })).toEqual({
      name: 'Sarah Kim',
      churchId: valid.church,
      newChurchName: null,
      newChurchCity: null,
      declaresChristian: true,
    });
  });

  it('sends a new church by its name and city', () => {
    expect(toJoinRequest({ ...newChurch, newChurchCity: ' Fort  Langley ' })).toEqual({
      name: 'Sarah Kim',
      churchId: null,
      newChurchName: 'Fort Langley Evangelical Free',
      newChurchCity: 'Fort Langley',
      declaresChristian: true,
    });
  });
});
