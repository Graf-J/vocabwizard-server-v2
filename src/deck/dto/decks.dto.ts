import { ApiProperty } from '@nestjs/swagger';
import { DeckDocument } from '../deck.schema';
import { Language } from '../languages.enum';

type EnhancedDeckDocument = DeckDocument & {
  newCardCount: number;
  oldCardCount: number;
};

export class DecksDto {
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
  @ApiProperty()
  newCardCount: number;
  @ApiProperty()
  oldCardCount: number;

  constructor(deck: EnhancedDeckDocument) {
    this.id = deck._id.toString();
    this.name = deck.name;
    this.learningRate = deck.learningRate;
    this.fromLang = deck.fromLang;
    this.toLang = deck.toLang;
    this.newCardCount = deck.newCardCount;
    this.oldCardCount = deck.oldCardCount;
  }
}
