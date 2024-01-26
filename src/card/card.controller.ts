import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Patch,
  ConflictException,
} from '@nestjs/common';
import { CardService } from './card.service';
import { CreateCardDto } from './dto/create-card.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { UpdateConfidenceDto } from './dto/update-confidence.dto';
import { Confidence } from './confidence.enum';
import { CardDto } from './dto/card.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ObjectIdValidationPipe } from '../util/pipe/objectid-validation.pipe';
import { OwnDeckOrAdminGuard } from '../auth/guard/ownDeckOrAdmin.guard';
import { OwnDeckOrAdminRequest } from '../util/request/own-deck-or-admin.request';
import { DeckService } from '../deck/deck.service';

@ApiTags('Card')
@ApiBearerAuth()
@UseGuards(OwnDeckOrAdminGuard)
@UseGuards(AuthGuard)
@Controller('decks/:deckId/cards')
export class CardController {
  constructor(
    private readonly deckService: DeckService,
    private readonly cardService: CardService,
  ) {}

  @Post()
  async create(
    @Req() request: OwnDeckOrAdminRequest,
    @Param('deckId', ObjectIdValidationPipe) _deckId: string,
    @Body() createCardDto: CreateCardDto,
  ) {
    const card = await this.cardService.create(createCardDto, request.deck);
    return { id: card.id };
  }

  @Get()
  async findAll(@Param('deckId', ObjectIdValidationPipe) deckId: string) {
    const cards = await this.cardService.findAll(deckId);
    return cards.map((card) => new CardDto(card));
  }

  @Get('learn')
  async findCardsToLearn(
    @Req() request: OwnDeckOrAdminRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Param('deckId', ObjectIdValidationPipe) _deckId: string,
  ) {
    const cards = await this.cardService.findCardsToLearn(request.deck);
    return cards.map((card) => new CardDto(card));
  }

  @Delete(':cardId')
  async remove(
    @Req() request: OwnDeckOrAdminRequest,
    @Param('cardId', ObjectIdValidationPipe) cardId: string,
  ) {
    const card = await this.cardService.findOne(cardId);
    if (card.deck.toString() !== request.deck.id) {
      throw new ConflictException('Card does not belong to Deck');
    }

    await this.cardService.remove(cardId);
  }

  @Patch(':cardId/confidence')
  async updateConfidence(
    @Req() request: OwnDeckOrAdminRequest,
    @Param('deckId', ObjectIdValidationPipe) _deckId: string,
    @Param('cardId', ObjectIdValidationPipe) cardId: string,
    @Body() updateConfidenceDto: UpdateConfidenceDto,
  ) {
    const card = await this.cardService.findOne(cardId);
    if (card.deck.toString() !== request.deck.id) {
      throw new ConflictException('Card does not belong to Deck');
    }

    switch (updateConfidenceDto.confidence) {
      case Confidence.hard:
        await this.cardService.updateCardHard(card);
        break;
      case Confidence.good:
        await this.cardService.updateCardGood(card);
        break;
      case Confidence.easy:
        await this.cardService.updateCardEasy(card);
        break;
    }

    await this.deckService.incrementTodayLearnedCards(request.deck);
  }
}
