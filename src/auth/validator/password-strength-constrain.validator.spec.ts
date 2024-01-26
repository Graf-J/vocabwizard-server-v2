import { PasswordStrengthConstraint } from './password-strength-constraint.validator';

describe('MatchConstraint', () => {
  let passwordStrengthConstriant: PasswordStrengthConstraint;

  beforeEach(() => {
    passwordStrengthConstriant = new PasswordStrengthConstraint();
  });

  it('should return false if password has neither number nor special character', () => {
    const password = 'test';

    expect(passwordStrengthConstriant.validate(password)).toBeFalsy();
    expect(passwordStrengthConstriant.defaultMessage()).toBe(
      'The password must contain at least one number and one special character.',
    );
  });

  it('should return false if password contains no number', () => {
    const password = '#test';

    expect(passwordStrengthConstriant.validate(password)).toBeFalsy();
    expect(passwordStrengthConstriant.defaultMessage()).toBe(
      'The password must contain at least one number and one special character.',
    );
  });

  it('should return false if password contains no special character', () => {
    const password = '9test';

    expect(passwordStrengthConstriant.validate(password)).toBeFalsy();
    expect(passwordStrengthConstriant.defaultMessage()).toBe(
      'The password must contain at least one number and one special character.',
    );
  });

  it('should return true if password contains a number and a special character', () => {
    const password = '9@test';

    expect(passwordStrengthConstriant.validate(password)).toBeTruthy();
  });
});
