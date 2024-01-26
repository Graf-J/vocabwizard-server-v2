import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Put,
  Patch,
} from '@nestjs/common';
import { DeckService } from './deck.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ObjectIdValidationPipe } from '../util/pipe/objectid-validation.pipe';
import { OwnDeckOrAdminGuard } from '../auth/guard/ownDeckOrAdmin.guard';
import { DecksDto } from './dto/decks.dto';
import { DeckDto } from './dto/deck.dto';
import { AuthGuardRequest } from '../util/request/auth-guard.request';
import { OwnDeckOrAdminRequest } from '../util/request/own-deck-or-admin.request';
import { ImportDeckDto } from './dto/import-deck.dto';
import { StatDto } from './dto/stat.dto';

@ApiTags('Deck')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('decks')
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @Post()
  async create(
    @Req() request: AuthGuardRequest,
    @Body() createDeckDto: CreateDeckDto,
  ) {
    const deck = await this.deckService.create(createDeckDto, request.user.id);
    return { id: deck.id };
  }

  @Get()
  async findAll(@Req() request: AuthGuardRequest) {
    const decks = await this.deckService.findAll(request.user.id);
    return decks.map((deck) => new DecksDto(deck));
  }

  @Post('import')
  async import(
    @Req() request: AuthGuardRequest,
    @Body() importDeckDto: ImportDeckDto,
  ) {
    await this.deckService.import(request.user.id, importDeckDto.deckId);
  }

  @UseGuards(OwnDeckOrAdminGuard)
  @Get(':deckId')
  findOne(
    @Req() request: OwnDeckOrAdminRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Param('deckId', ObjectIdValidationPipe) _deckId: string,
  ) {
    return new DeckDto(request.deck);
  }

  @UseGuards(OwnDeckOrAdminGuard)
  @Get(':deckId/stats')
  async stats(@Param('deckId', ObjectIdValidationPipe) deckId: string) {
    const stats = await this.deckService.stats(deckId);
    return stats.map((stat) => new StatDto(stat));
  }

  @UseGuards(OwnDeckOrAdminGuard)
  @Put(':deckId')
  async update(
    @Req() request: OwnDeckOrAdminRequest,
    @Param('deckId', ObjectIdValidationPipe) deckId: string,
    @Body() updateDeckDto: UpdateDeckDto,
  ) {
    const updatedDeck = await this.deckService.update(
      deckId,
      updateDeckDto,
      request.deck.creator.toString(),
    );
    return new DeckDto(updatedDeck);
  }

  @UseGuards(OwnDeckOrAdminGuard)
  @Patch(':deckId/swap')
  async swap(
    @Req() request: OwnDeckOrAdminRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Param('deckId', ObjectIdValidationPipe) _deckId: string,
  ) {
    await this.deckService.swap(request.deck, request.user.id);
  }

  @UseGuards(OwnDeckOrAdminGuard)
  @Delete(':deckId')
  async remove(@Param('deckId', ObjectIdValidationPipe) deckId: string) {
    await this.deckService.remove(deckId);
  }
}
