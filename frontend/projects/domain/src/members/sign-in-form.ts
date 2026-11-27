/** What the sign-in form holds (L2-037). */
export interface SignInForm {
  readonly email: string;
  readonly password: string;
}

/** Each empty field and why, in the words the form shows (L2-037, criterion 8). */
export interface SignInErrors {
  readonly email?: string;
  readonly password?: string;
}

/**
 * The fields of the sign-in form that are empty (L2-037, criterion 8). Only emptiness is checked
 * here: whether the email and password match an account is the backend's to say, in one
 * refusal (criterion 2). A password is never trimmed.
 */
export function validateSignIn(form: SignInForm): SignInErrors {
  return {
    ...(form.email.trim() === '' ? { email: 'Enter your email.' } : {}),
    ...(form.password === '' ? { password: 'Enter your password.' } : {}),
  };
}
