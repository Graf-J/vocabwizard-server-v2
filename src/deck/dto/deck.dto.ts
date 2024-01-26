import { ApiProperty } from '@nestjs/swagger';
import { DeckDocument } from '../deck.schema';
import { Language } from '../languages.enum';

export class DeckDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  learningRate: number;
  @ApiProperty({ enum: Language })
  fromLang: Language;
  @ApiProperty({ enum: Language })
  toLang: Language;

  constructor(deck: DeckDocument) {
    this.id = deck.id;
    this.name = deck.name;
    this.learningRate = deck.learningRate;
    this.fromLang = deck.fromLang;
    this.toLang = deck.toLang;
  }
}
