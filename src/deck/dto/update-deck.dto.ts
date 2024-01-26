import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min, MinLength } from 'class-validator';

export class UpdateDeckDto {
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
}
