import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportDeckDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deckId: string;
}
