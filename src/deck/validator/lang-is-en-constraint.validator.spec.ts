import { ValidationArguments } from 'class-validator';
import { Language } from '../languages.enum';
import { LangIsEnConstraint } from './lang-is-en-constraint.validator';

describe('LangIsEnConstraint', () => {
  let langIsEnConstraint: LangIsEnConstraint;

  beforeAll(() => {
    langIsEnConstraint = new LangIsEnConstraint();
  });

  it('should return false if both value and related value are not Language.en', () => {
    const validationArguments: ValidationArguments = {
      object: { otherLang: Language.fr },
      constraints: ['otherLang'],
      property: 'currentLang',
      value: Language.es,
      targetName: '',
    };

    const result = langIsEnConstraint.validate(
      Language.es,
      validationArguments,
    );
    expect(result).toBeFalsy();
    expect(langIsEnConstraint.defaultMessage(validationArguments)).toBe(
      'Either currentLang or otherLang must be en',
    );
  });

  it('should return true if one value is Language.en', () => {
    const validationArguments: ValidationArguments = {
      object: { otherLang: Language.fr },
      constraints: ['otherLang'],
      property: 'currentLang',
      value: Language.en,
      targetName: '',
    };

    const result = langIsEnConstraint.validate(
      Language.en,
      validationArguments,
    );
    expect(result).toBeTruthy();
  });
});
