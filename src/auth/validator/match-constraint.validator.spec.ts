import { MatchConstraint } from './match-constraint.validator';
import { ValidationArguments } from 'class-validator';

describe('MatchConstraint', () => {
  let matchConstraint: MatchConstraint;

  beforeEach(() => {
    matchConstraint = new MatchConstraint();
  });

  it('should return false if values do not match', () => {
    const value = 'myValue';
    const relatedPropertyName = 'property';
    const relatedValue = 'differentValue';

    const args: ValidationArguments = {
      object: {
        [relatedPropertyName]: relatedValue,
      },
      property: 'testField',
      value,
      constraints: [relatedPropertyName],
      targetName: '',
    };

    expect(matchConstraint.validate(value, args)).toBeFalsy();
    expect(matchConstraint.defaultMessage(args)).toBe(
      'The testField and property must match.',
    );
  });

  it('should return false if values do not match', () => {
    const value = 'myValue';
    const relatedPropertyName = 'property';
    const relatedValue = 'myValue';

    const args: ValidationArguments = {
      object: {
        [relatedPropertyName]: relatedValue,
      },
      property: 'testField',
      value,
      constraints: [relatedPropertyName],
      targetName: '',
    };

    expect(matchConstraint.validate(value, args)).toBeTruthy();
  });
});
