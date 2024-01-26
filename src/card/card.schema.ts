import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Deck } from '../deck/deck.schema';

export type CardDocument = HydratedDocument<Card>;

@Schema()
export class Card {
  @Prop({ required: true })
  word: string;

  @Prop({ required: true })
  translation: string;

  @Prop({ default: null })
  phonetic?: string;

  @Prop({ default: null })
  audioLink?: string;

  @Prop({ default: [] })
  definitions: string[];

  @Prop({ default: [] })
  examples: string[];

  @Prop({ default: [] })
  synonyms: string[];

  @Prop({ default: [] })
  antonyms: string[];

  @Prop({ required: true, default: 0 })
  stage: number;

  @Prop({ default: null })
  expires?: Date;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
  })
  deck: Deck;

  @Prop({ required: true })
  createdAt: Date;
}

export const CardSchema = SchemaFactory.createForClass(Card);
