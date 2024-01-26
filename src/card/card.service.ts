import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCardDto } from './dto/create-card.dto';
import { Deck, DeckDocument } from '../deck/deck.schema';
import { Language } from '../deck/languages.enum';
import { LexicalInfoService } from './lexical-info.service';
import ApiDictionaryResponse, {
  Phonetic,
} from './response/api-dictionary-response';
import { InjectModel } from '@nestjs/mongoose';
import { Card, CardDocument } from './card.schema';
import { Model } from 'mongoose';
import { OpenAIService } from './openai.service';

@Injectable()
export class CardService {
  constructor(
    private readonly lexicalInfoService: LexicalInfoService,
    private readonly openAIService: OpenAIService,
    @InjectModel(Card.name) private readonly cardModel: Model<CardDocument>,
  ) {}

  async create(createCardDto: CreateCardDto, deck: DeckDocument) {
    // Validate if Word doesn't already exist
    const duplicate = await this.cardModel.findOne({
      word: createCardDto.word,
      deck: deck.id,
    });
    if (duplicate) {
      throw new ConflictException(
        `The word ${createCardDto.word} already exists in this deck`,
      );
    }

    const cardInfo = await this.openAIService.getInformation(
      createCardDto.word,
      deck.fromLang,
      deck.toLang,
    );

    const word =
      deck.fromLang === Language.en ? createCardDto.word : cardInfo.translation;
    const lexicalInfoResponse = await this.lexicalInfoService.getInfo(word);
    let phoneticData;
    if (!lexicalInfoResponse.error) {
      phoneticData = this.extractInformation(lexicalInfoResponse.data[0]);
    }

    // Insert Card into Database
    const card = await this.cardModel.create({
      word: createCardDto.word,
      ...phoneticData,
      ...cardInfo,
      deck: deck,
      createdAt: Date.now(),
    });
    return card;
  }

  async copy(cards: CardDocument[], deck: Deck, swap: boolean = false) {
    const currentDate = new Date();
    await Promise.all(
      cards.map(async (card) => {
        await this.cardModel.create({
          word: swap ? card.translation : card.word,
          translation: swap ? card.word : card.translation,
          phonetic: card.phonetic,
          audioLink: card.audioLink,
          definitions: card.definitions,
          examples: card.examples,
          synonyms: card.synonyms,
          antonyms: card.antonyms,
          stage: 0,
          expires: null,
          deck: deck,
          createdAt: currentDate,
        });
      }),
    );
  }

  extractInformation(apiDictionaryResponse: ApiDictionaryResponse) {
    const phonetic = this.extractPhonetic(apiDictionaryResponse);

    return phonetic;
  }

  extractPhonetic(apiDictionaryResponse: ApiDictionaryResponse) {
    let phonetic;
    let audioLink;
    const audioPhonetic = apiDictionaryResponse.phonetics.find(
      (p: Phonetic) => p.audio,
    );
    if (audioPhonetic) {
      phonetic = audioPhonetic.text;
      audioLink = audioPhonetic.audio;
    } else {
      phonetic = apiDictionaryResponse.phonetic;
    }

    return {
      phonetic,
      audioLink,
    };
  }

  async findAll(deckId: string) {
    return await this.cardModel.find({ deck: deckId });
  }

  async findCardsToLearn(deck: DeckDocument) {
    const currentDate = new Date();

    // Queries
    const newCardsQuery = {
      deck: deck.id,
      expires: null,
    };
    const oldCardsQuery = {
      deck: deck.id,
      expires: { $lt: currentDate },
    };

    // Options
    const limit = this.calculateLimit(deck);
    const newCardsOptions = {
      sort: { createdAt: 1 },
      limit: limit,
    };
    const oldCardsOptions = {
      sort: { expires: 1 },
    };

    const [newCards, oldCards] = await Promise.all([
      this.cardModel.find(newCardsQuery, null, newCardsOptions),
      this.cardModel.find(oldCardsQuery, null, oldCardsOptions),
    ]);

    return newCards.concat(oldCards);
  }

  async findOne(id: string) {
    const card = await this.cardModel.findById(id);

    if (!card) {
      throw new NotFoundException(`Card not found`);
    }

    return card;
  }

  async remove(id: string) {
    await this.cardModel.deleteOne({ _id: id });
  }

  async removeCardsFromDecks(deckIds: string[]) {
    await this.cardModel.deleteMany({ deck: { $in: deckIds } });
  }

  async updateCardHard(card: CardDocument) {
    let stage: number;
    if (card.stage <= 2) {
      stage = 0;
    } else if (card.stage <= 4) {
      stage = 1;
    } else if (card.stage <= 6) {
      stage = 2;
    } else {
      stage = 3;
    }

    await this.updateCard(card.id, stage);
  }

  async updateCardGood(card: CardDocument) {
    let stage = card.stage;
    if (stage < 8) {
      stage++;
    }

    await this.updateCard(card.id, stage);
  }

  async updateCardEasy(card: CardDocument) {
    let stage: number;
    if (card.stage <= 6) {
      stage = card.stage += 2;
    } else {
      stage = 8;
    }

    await this.updateCard(card.id, stage);
  }

  async updateCard(cardId: string, stage: number) {
    await this.cardModel.updateOne(
      { _id: cardId },
      {
        $set: {
          stage: stage,
          expires: this.convertStageToDate(stage),
        },
      },
    );
  }

  // expiresDate is in 2^stage days at midnight
  convertStageToDate(stage: number) {
    const currentDate = new Date();
    const expiresDate = new Date();
    expiresDate.setDate(currentDate.getDate() + Math.pow(2, stage));
    expiresDate.setHours(0, 0, 0, 0);

    return expiresDate;
  }

  calculateLimit(deck: DeckDocument) {
    if (!deck.lastTimeLearned) {
      return deck.learningRate;
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let limit = deck.learningRate;
    if (currentDate.getTime() === deck.lastTimeLearned.getTime()) {
      limit = Math.max(deck.learningRate - deck.numCardsLearned, 0);
    }

    return limit;
  }
}
