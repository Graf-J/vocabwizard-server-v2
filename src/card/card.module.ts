import { Module, forwardRef } from '@nestjs/common';
import { CardService } from './card.service';
import { TranslatorService } from './translator.service';
import { LexicalInfoService } from './lexical-info.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Card, CardSchema } from './card.schema';
import { DeckModule } from '../deck/deck.module';
import { CardController } from './card.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Card.name, schema: CardSchema }]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    forwardRef(() => DeckModule),
  ],
  controllers: [CardController],
  providers: [CardService, TranslatorService, LexicalInfoService],
  exports: [CardService],
})
export class CardModule {}
