import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from './card.service';
import { Card, CardDocument } from './card.schema';
import { getModelToken } from '@nestjs/mongoose';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { Model } from 'mongoose';
import { Deck, DeckDocument } from '../deck/deck.schema';

describe('CardService', () => {
  let service: CardService;
  let cardModel: DeepMocked<Model<CardDocument>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        {
          provide: getModelToken(Card.name),
          useValue: createMock<Model<CardDocument>>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get(CardService);
    cardModel = module.get(getModelToken(Card.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('copy', () => {
    let cards: CardDocument[];
    let deck: Deck;

    beforeEach(() => {
      const first_card = createMock<CardDocument>();
      first_card.word = 'haus';
      first_card.translation = 'house';

      const second_card = createMock<CardDocument>();
      second_card.word = 'tier';
      second_card.translation = 'animal';

      cards = [first_card, second_card];

      deck = createMock<Deck>();
    });

    it('should create new cards without swap', async () => {
      await service.copy(cards, deck);

      expect(cardModel.create).toHaveBeenCalledTimes(2);
      expect(cardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'haus',
          translation: 'house',
        }),
      );
      expect(cardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'tier',
          translation: 'animal',
        }),
      );
    });

    it('should create new cards with swap', async () => {
      await service.copy(cards, deck, true);

      expect(cardModel.create).toHaveBeenCalledTimes(2);
      expect(cardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'house',
          translation: 'haus',
        }),
      );
      expect(cardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'animal',
          translation: 'tier',
        }),
      );
    });
  });

  describe('extractPhonetic', () => {
    it('should return phonetic and audioLink from phonetics list', () => {
      const apiDictionaryResponse = {
        word: 'example',
        phonetic: 'firstPhonetic',
        phonetics: [
          {
            audio: 'https://example.com/audio.mp3',
            text: 'secondPhonetic',
            sourceUrl: 'https://example.com',
            license: {
              name: 'Example License',
              url: 'https://example-license.com',
            },
          },
        ],
        meanings: [],
        license: undefined,
        sourceUrls: [],
      };

      const response = service.extractPhonetic(apiDictionaryResponse);
      expect(response).toEqual({
        phonetic: 'secondPhonetic',
        audioLink: 'https://example.com/audio.mp3',
      });
    });

    it('should return phonetic first phonetic form property and no audioLink', () => {
      const apiDictionaryResponse = {
        word: 'example',
        phonetic: 'firstPhonetic',
        phonetics: [],
        meanings: [],
        license: undefined,
        sourceUrls: [],
      };

      const response = service.extractPhonetic(apiDictionaryResponse);
      expect(response).toEqual({
        phonetic: 'firstPhonetic',
        audioLink: undefined,
      });
    });
  });

  describe('findAll', () => {
    it('should query database', async () => {
      await service.findAll('id');
      expect(cardModel.find).toHaveBeenCalledWith({ deck: 'id' });
    });
  });

  describe('findCardsToLearn', () => {
    it('should query for old and for new cards', async () => {
      const deck = createMock<DeckDocument>();
      deck.lastTimeLearned = new Date();

      await service.findCardsToLearn(deck);

      expect(cardModel.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    it('should delete card from database', async () => {
      await service.remove('id');

      expect(cardModel.deleteOne).toHaveBeenCalledWith({ _id: 'id' });
    });
  });

  describe('removeCardsFromDeck', () => {
    it('should delete many cards from a deck from database', async () => {
      await service.removeCardsFromDecks(['1', '2', '3', '4']);

      expect(cardModel.deleteMany).toHaveBeenCalledWith({
        deck: { $in: ['1', '2', '3', '4'] },
      });
    });
  });

  describe('updateCardHard', () => {
    let updateCardSpy;

    beforeEach(() => {
      updateCardSpy = jest.spyOn(service, 'updateCard');
      updateCardSpy.mockResolvedValue(null);
    });

    it('should update stage to 0 if stage is negative', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = -1;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 0);
    });

    it('should update stage to 0 if stage less or equal than 2', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = 2;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 0);
    });

    it('should update stage to 1 if stage less or equal than 4', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = 4;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 1);
    });

    it('should update stage to 2 if stage less or equal than 6', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = 6;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 2);
    });

    it('should update stage to 3 if stage greater than 6', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = 8;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 3);
    });
  });

  describe('updateCardEasy', () => {
    let updateCardSpy;
    let card: CardDocument;

    beforeEach(() => {
      updateCardSpy = jest.spyOn(service, 'updateCard');
      updateCardSpy.mockResolvedValue(null);

      card = createMock<CardDocument>();
      card.id = 'id';
    });

    it('should update increment stage by 1 if stage is smaller than 8', async () => {
      card.stage = 3;

      await service.updateCardGood(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 4);
    });

    it('should keep stage 8 if stage is already 8', async () => {
      card.stage = 8;

      await service.updateCardGood(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 8);
    });
  });

  describe('updateCardEasy', () => {
    let updateCardSpy;
    let card: CardDocument;

    beforeEach(() => {
      updateCardSpy = jest.spyOn(service, 'updateCard');
      updateCardSpy.mockResolvedValue(null);

      card = createMock<CardDocument>();
      card.id = 'id';
    });

    it('should update increment stage by 2 if stage is smaller than 7', async () => {
      card.stage = 3;

      await service.updateCardEasy(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 5);
    });

    it('should update stage only to 8 if stage is already 7', async () => {
      card.stage = 7;

      await service.updateCardEasy(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 8);
    });
  });

  describe('convertStageToDate', () => {
    const RealDate = Date;

    beforeEach(() => {
      const MockDate = jest.fn(() => new RealDate('2024-01-01T10:42:00Z'));
      global.Date = MockDate as any;
    });

    afterEach(() => {
      global.Date = RealDate;
    });

    it('should return 1 for stage 0', () => {
      const result = service.convertStageToDate(0);

      const predictDate = new Date();
      predictDate.setHours(0, 0, 0, 0);
      predictDate.setDate(predictDate.getDate() + 1);

      expect(result).toEqual(predictDate);
    });

    it('should return 256 for stage 8', () => {
      const result = service.convertStageToDate(8);

      const predictDate = new Date();
      predictDate.setHours(0, 0, 0, 0);
      predictDate.setDate(predictDate.getDate() + 256);

      expect(result).toEqual(predictDate);
    });
  });

  describe('calculateLimit', () => {
    const RealDate = Date;

    beforeEach(() => {
      const MockDate = jest.fn(() => new RealDate('2024-01-01T10:42:00Z'));
      global.Date = MockDate as any;
    });

    afterEach(() => {
      global.Date = RealDate;
    });

    it('should return learningRate if card never learned', () => {
      const deck = createMock<DeckDocument>();
      deck.lastTimeLearned = null;
      deck.learningRate = 10;

      expect(service.calculateLimit(deck)).toBe(10);
    });

    it('should return leraningRate if not learned today', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const deck = createMock<DeckDocument>();
      deck.lastTimeLearned = yesterday;

      deck.numCardsLearned = 3;
      deck.learningRate = 10;

      expect(service.calculateLimit(deck)).toBe(10);
    });

    it('should return difference between learningRate and numCardsLearned if already learned today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const deck = createMock<DeckDocument>();
      deck.lastTimeLearned = today;

      deck.numCardsLearned = 3;
      deck.learningRate = 10;

      expect(service.calculateLimit(deck)).toBe(7);
    });
  });
});
