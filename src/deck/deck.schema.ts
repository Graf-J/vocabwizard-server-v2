import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Language } from './languages.enum';
import { User } from '../user/user.schema';

export type DeckDocument = HydratedDocument<Deck>;

@Schema()
export class Deck {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  learningRate: number;

  @Prop({
    required: true,
    type: String,
    enum: Language,
  })
  fromLang: Language;

  @Prop({
    required: true,
    type: String,
    enum: Language,
  })
  toLang: Language;

  @Prop({ default: 0 })
  numCardsLearned: number;

  @Prop({ default: null })
  lastTimeLearned?: Date;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  creator: User;

  @Prop({ required: true })
  createdAt: Date;
}

export const DeckSchema = SchemaFactory.createForClass(Deck);
