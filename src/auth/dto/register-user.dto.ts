import { IsNotEmpty, IsString, MinLength, Validate } from 'class-validator';
import { PasswordStrengthConstraint } from '../validator/password-strength-constraint.validator';
import { MatchConstraint } from '../validator/match-constraint.validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({ minLength: 4 })
  @IsString()
  @MinLength(4)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Validate(PasswordStrengthConstraint, ['password'])
  password: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @Validate(MatchConstraint, ['password'])
  passwordConfirmation: string;
}
