import { validateSignIn } from './sign-in-form';

// L2-037 criterion 8: which fields are marked, one case per row.
describe('validateSignIn', () => {
  const cases: [string, string, string, object][] = [
    ['both given', 'sarah.kim@example.ca', 'correct horse', {}],
    ['no email', '', 'correct horse', { email: 'Enter your email.' }],
    ['only spaces for an email', '   ', 'correct horse', { email: 'Enter your email.' }],
    ['no password', 'sarah.kim@example.ca', '', { password: 'Enter your password.' }],
    ['neither', '', '', { email: 'Enter your email.', password: 'Enter your password.' }],
    ['a password of spaces, which is kept', 'sarah.kim@example.ca', '   ', {}],
  ];

  it.each(cases)('with %s', (_case, email, password, errors) => {
    expect(validateSignIn({ email, password })).toEqual(errors);
  });
});
