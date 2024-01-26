import { ValidationArguments } from 'class-validator';
import { NotMatchConstraint } from './not-match-constraint.validator';
import { Language } from '../languages.enum';

describe('NotMatchConstraint', () => {
  let notMatchConstraint: NotMatchConstraint;

  beforeEach(() => {
    notMatchConstraint = new NotMatchConstraint();
  });

  it('should return false if value is equal to related value', () => {
    const validationArguments: ValidationArguments = {
      object: { otherValue: Language.en },
      constraints: ['otherValue'],
      property: 'currentValue',
      value: Language.en,
      targetName: '',
    };

    const result = notMatchConstraint.validate(
      Language.en,
      validationArguments,
    );
    expect(result).toBeFalsy();
    expect(notMatchConstraint.defaultMessage(validationArguments)).toBe(
      'currentValue and otherValue must not match',
    );
  });

  it('should return true if value is not equal to related value', () => {
    const validationArguments: ValidationArguments = {
      object: { otherValue: 'other123' },
      constraints: ['otherValue'],
      property: 'currentValue',
      value: 'test123',
      targetName: '',
    };

    const result = notMatchConstraint.validate('test123', validationArguments);
    expect(result).toBeTruthy();
  });
});
