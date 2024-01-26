import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Deck, DeckDocument } from './deck.schema';
import mongoose, { Model, Types, isValidObjectId } from 'mongoose';
import { CardService } from '../card/card.service';

@Injectable()
export class DeckService {
  constructor(
    @InjectModel(Deck.name) private readonly deckModel: Model<DeckDocument>,
    private readonly cardService: CardService,
  ) {}

  async create(createDeckDto: CreateDeckDto, creatorId: string) {
    // Check if Deck already exists for User
    const duplicate = await this.deckModel.findOne({
      name: createDeckDto.name,
      creator: creatorId,
    });
    if (duplicate) {
      throw new ConflictException(`Deck already exists: ${createDeckDto.name}`);
    }

    // Insert Deck into Database
    const deck = await this.deckModel.create({
      ...createDeckDto,
      creator: creatorId,
      createdAt: Date.now(),
    });

    return deck;
  }

  async findAll(userId: string) {
    const currentDate = new Date();
    // Joins New Cards with the Decks (cards where expires = null)
    const lookupNewCards = {
      $lookup: {
        from: 'cards',
        localField: '_id',
        foreignField: 'deck',
        as: 'newCards',
        pipeline: [
          {
            $match: { expires: null },
          },
        ],
      },
    };
    // Joins Old Cards with the Decks (cards where expires < Date.now)
    const lookupOldCards = {
      $lookup: {
        from: 'cards',
        localField: '_id',
        foreignField: 'deck',
        as: 'oldCards',
        pipeline: [{ $match: { expires: { $lt: currentDate } } }],
      },
    };
    // Aggregates old and new cards into a count variable
    const countCards = {
      $addFields: {
        newCardCount: { $size: '$newCards' },
        oldCardCount: { $size: '$oldCards' },
      },
    };
    // Excludes newCards and oldCards to save bandwidth
    const projection = {
      $project: {
        newCards: 0,
        oldCards: 0,
      },
    };
    // Execute statements and return result
    const decks = await this.deckModel.aggregate([
      { $match: { creator: new mongoose.Types.ObjectId(userId) } },
      lookupNewCards,
      lookupOldCards,
      countCards,
      projection,
      { $sort: { createdAt: 1 } },
    ]);

    return decks.map((deck) => ({
      ...deck,
      newCardCount: this.calculateNewCardsAmount(deck),
    }));
  }

  async findOne(id: string): Promise<DeckDocument> {
    const deck = await this.deckModel.findById(id);

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return deck;
  }

  async import(userId: string, deckId: string) {
    if (!isValidObjectId(deckId)) {
      throw new BadRequestException(`Invalid ObjectId: ${deckId}`);
    }

    const deck = await this.findOne(deckId);

    if (deck.creator.toString() == userId) {
      throw new ConflictException('You already own this deck');
    }

    const newDeck = await this.create(
      {
        name: deck.name,
        learningRate: deck.learningRate,
        fromLang: deck.fromLang,
        toLang: deck.toLang,
      },
      userId,
    );

    const cards = await this.cardService.findAll(deckId);
    await this.cardService.copy(cards, newDeck);
  }

  async swap(deck: DeckDocument, userId: string) {
    const newDeck = await this.create(
      {
        name: `${deck.name}-Reversed`,
        learningRate: deck.learningRate,
        fromLang: deck.toLang,
        toLang: deck.fromLang,
      },
      userId,
    );

    const cards = await this.cardService.findAll(deck.id);
    await this.cardService.copy(cards, newDeck, true);
  }

  async update(id: string, updateDeckDto: UpdateDeckDto, creatorId: string) {
    const duplicate = await this.deckModel.findOne({
      name: updateDeckDto.name,
      creator: creatorId,
    });
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException(`Deck already exists: ${updateDeckDto.name}`);
    }

    return await this.deckModel.findByIdAndUpdate(
      id,
      { $set: updateDeckDto },
      { new: true },
    );
  }

  async incrementTodayLearnedCards(deck: DeckDocument) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Update amount of cards learned today and update date in neccessary
    if (
      !deck.lastTimeLearned ||
      deck.lastTimeLearned.getTime() !== currentDate.getTime()
    ) {
      await this.deckModel.findByIdAndUpdate(
        { _id: deck.id },
        {
          $set: {
            lastTimeLearned: currentDate,
            numCardsLearned: 1,
          },
        },
        { new: true },
      );
    } else {
      await this.deckModel.findOneAndUpdate(
        { _id: deck.id },
        {
          $inc: { numCardsLearned: 1 },
        },
        { new: true },
      );
    }
  }

  async stats(id: string) {
    const deckObjectId = new Types.ObjectId(id);

    // Gets Cards from Deck with id and counts the groups by stage
    return await this.deckModel.aggregate([
      {
        $match: {
          _id: deckObjectId,
        },
      },
      {
        $lookup: {
          from: 'cards',
          localField: '_id',
          foreignField: 'deck',
          as: 'cards',
        },
      },
      {
        $unwind: '$cards',
      },
      {
        $group: {
          _id: '$cards.stage',
          count: { $sum: 1 },
        },
      },
    ]);
  }

  async remove(id: string) {
    await Promise.all([
      this.cardService.removeCardsFromDecks([id]),
      this.deckModel.deleteOne({ _id: id }),
    ]);
  }

  async removeDecksFromUser(creatorId: string) {
    const decks = await this.deckModel.find({ creator: creatorId });
    await Promise.all([
      this.deckModel.deleteMany({ creator: creatorId }),
      this.cardService.removeCardsFromDecks(
        decks.map((deck) => deck._id.toString()),
      ),
    ]);
  }

  calculateNewCardsAmount(deck: DeckDocument & { newCardCount: number }) {
    if (!deck.lastTimeLearned) {
      return Math.min(deck.learningRate, deck.newCardCount);
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let potentialNewCards = deck.learningRate;
    if (currentDate.getTime() === deck.lastTimeLearned.getTime()) {
      potentialNewCards = Math.max(deck.learningRate - deck.numCardsLearned, 0);
    }

    return Math.min(potentialNewCards, deck.newCardCount);
  }
}
