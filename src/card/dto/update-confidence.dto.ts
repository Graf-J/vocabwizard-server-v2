import { IsEnum, IsNotEmpty } from 'class-validator';
import { Confidence } from '../confidence.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfidenceDto {
  @ApiProperty({ enum: Confidence })
  @IsEnum(Confidence)
  @IsNotEmpty()
  confidence: Confidence;
}
