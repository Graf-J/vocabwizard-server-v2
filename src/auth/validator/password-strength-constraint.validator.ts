import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'passwordStrength', async: false })
export class PasswordStrengthConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string) {
    const numberRegex = /\d/;
    const specialCharacterRegex = /[!@#$%^&*(),.?":{}|<>]/;

    return numberRegex.test(value) && specialCharacterRegex.test(value);
  }

  defaultMessage() {
    return 'The password must contain at least one number and one special character.';
  }
}
