import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  MinLength,
  Validate,
} from 'class-validator';
import { Language } from '../languages.enum';
import { NotMatchConstraint } from '../validator/not-match-constraint.validator';
import { LangIsEnConstraint } from '../validator/lang-is-en-constraint.validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeckDto {
  @ApiProperty({ minLength: 4 })
  @IsString()
  @MinLength(4)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  learningRate: number;

  @ApiProperty({ enum: Language })
  @IsEnum(Language)
  @IsNotEmpty()
  fromLang: Language;

  @ApiProperty({ enum: Language })
  @IsEnum(Language)
  @IsNotEmpty()
  @Validate(NotMatchConstraint, ['fromLang'])
  @Validate(LangIsEnConstraint, ['fromLang'])
  toLang: Language;
}
