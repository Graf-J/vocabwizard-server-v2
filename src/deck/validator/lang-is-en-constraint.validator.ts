import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Language } from '../languages.enum';

// Ensures either fromLang or toLang is English
@ValidatorConstraint({ name: 'langIsEn', async: false })
export class LangIsEnConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    return value === Language.en || relatedValue === Language.en;
  }

  defaultMessage(args: ValidationArguments) {
    return `Either ${args.property} or ${args.constraints[0]} must be ${Language.en}`;
  }
}
