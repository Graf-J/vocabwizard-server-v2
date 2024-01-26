import { ApiProperty } from '@nestjs/swagger';
import { CardDocument } from '../card.schema';

export class CardDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  word: string;
  @ApiProperty()
  translation: string;
  @ApiProperty()
  phonetic?: string;
  @ApiProperty()
  audioLink?: string;
  @ApiProperty()
  definitions: string[];
  @ApiProperty()
  examples: string[];
  @ApiProperty()
  synonyms: string[];
  @ApiProperty()
  antonyms: string[];

  constructor(card: CardDocument) {
    this.id = card.id;
    this.word = card.word;
    this.translation = card.translation;
    this.phonetic = card.phonetic;
    this.audioLink = card.audioLink;
    this.definitions = card.definitions;
    this.examples = card.examples;
    this.synonyms = card.synonyms;
    this.antonyms = card.antonyms;
  }
}
