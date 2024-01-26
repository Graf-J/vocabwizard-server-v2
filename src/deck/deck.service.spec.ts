import { Test, TestingModule } from '@nestjs/testing';
import { DeckService } from './deck.service';
import { getModelToken } from '@nestjs/mongoose';
import { Deck, DeckDocument } from './deck.schema';
import { Model } from 'mongoose';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { CardService } from '../card/card.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Language } from './languages.enum';
import { UpdateDeckDto } from './dto/update-deck.dto';

describe('DeckService', () => {
  let service: DeckService;
  let deckModel: DeepMocked<Model<DeckDocument>>;
  let cardService: DeepMocked<CardService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckService,
        {
          provide: getModelToken(Deck.name),
          useValue: createMock<Model<DeckDocument>>(),
        },
        {
          provide: CardService,
          useValue: createMock<CardService>(),
        },
      ],
    }).compile();

    service = module.get(DeckService);
    deckModel = module.get(getModelToken(Deck.name));
    cardService = module.get(CardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw exception if duplicate name', async () => {
      const createDeckDto = createMock<CreateDeckDto>();
      createDeckDto.name = 'TestDeck';

      deckModel.findOne.mockResolvedValue({});

      const responsePromise = service.create(createDeckDto, 'id');
      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        'Deck already exists: TestDeck',
      );
      expect(deckModel.create).toHaveBeenCalledTimes(0);
    });

    it('should create deck if success', async () => {
      const createDeckDto = createMock<CreateDeckDto>();

      deckModel.findOne.mockResolvedValue(null);

      await expect(
        service.create(createDeckDto, 'creatorId'),
      ).resolves.not.toThrow();
      expect(deckModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should call database and calculate newCardsAmount for each deck', async () => {
      const calculateNewCardsAmountSpy = jest
        .spyOn(service, 'calculateNewCardsAmount')
        .mockReturnValue(10);

      deckModel.aggregate.mockResolvedValue([{}, {}, {}]);

      await expect(
        service.findAll('507f1f77bcf86cd799439011'),
      ).resolves.not.toThrow();
      expect(calculateNewCardsAmountSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('findOne', () => {
    it('should throw exception if no deck gets found', async () => {
      deckModel.findById.mockResolvedValue(null);

      const responsePromise = service.findOne('1');

      expect(responsePromise).rejects.toThrow(NotFoundException);
      expect(responsePromise).rejects.toThrow('Deck not found');
    });

    it('should return deck if found', async () => {
      const deckValue = {
        _id: '1',
        name: 'TestDeck',
      };

      deckModel.findById.mockResolvedValue(deckValue);

      const response = await service.findOne('1');
      expect(response).toEqual(deckValue);
    });
  });

  describe('import', () => {
    it('should throw exception if deckId is invalid', async () => {
      const findOne = jest.spyOn(service, 'findOne').mockReturnValue(
        Promise.resolve({
          name: 'TestDeck',
          learningRate: 10,
          fromLang: Language.de,
          toLang: Language.en,
        } as DeckDocument),
      );

      const create = jest
        .spyOn(service, 'create')
        .mockReturnValue(Promise.resolve(null));

      const responsePromise = service.import('userId', 'invalidDeckId');

      await expect(responsePromise).rejects.toThrow(BadRequestException);
      await expect(responsePromise).rejects.toThrow(
        'Invalid ObjectId: invalidDeckId',
      );
      expect(findOne).toHaveBeenCalledTimes(0);
      expect(create).toHaveBeenCalledTimes(0);
    });

    it('should throw exception if user already owns this deck', async () => {
      const findOne = jest.spyOn(service, 'findOne').mockReturnValue(
        Promise.resolve({
          name: 'TestDeck',
          learningRate: 10,
          fromLang: Language.de,
          toLang: Language.en,
          creator: {
            toString: jest.fn().mockReturnValue('sameUserId'),
          },
        } as unknown as DeckDocument),
      );

      const create = jest
        .spyOn(service, 'create')
        .mockReturnValue(Promise.resolve(null));

      const responsePromise = service.import(
        'sameUserId',
        '507f1f77bcf86cd799439011',
      );

      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        'You already own this deck',
      );
      expect(findOne).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(0);
    });

    it('should succeed', async () => {
      const findOne = jest.spyOn(service, 'findOne').mockReturnValue(
        Promise.resolve({
          name: 'TestDeck',
          learningRate: 10,
          fromLang: Language.de,
          toLang: Language.en,
          creator: {
            toString: jest.fn().mockReturnValue('userId'),
          },
        } as unknown as DeckDocument),
      );

      const create = jest
        .spyOn(service, 'create')
        .mockReturnValue(Promise.resolve(null));

      const responsePromise = service.import(
        'otherUserId',
        '507f1f77bcf86cd799439011',
      );

      await expect(responsePromise).resolves.not.toThrow();
      expect(findOne).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe('swap', () => {
    it('should create new deck with new name and swapped languages', async () => {
      const create = jest
        .spyOn(service, 'create')
        .mockReturnValue(Promise.resolve(null));

      await service.swap(
        {
          name: 'TestDeck',
          learningRate: 10,
          fromLang: Language.de,
          toLang: Language.en,
        } as unknown as DeckDocument,
        'userId',
      );

      expect(create).toHaveBeenCalledWith(
        {
          name: 'TestDeck-Reversed',
          learningRate: 10,
          fromLang: Language.en,
          toLang: Language.de,
        },
        'userId',
      );
      expect(cardService.copy).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should throw exception if other deck already has the same name', async () => {
      const updateDeckDto = createMock<UpdateDeckDto>();
      updateDeckDto.name = 'TestDeck';

      deckModel.findOne.mockResolvedValue({
        id: 'deckId',
      });

      const responsePromise = service.update(
        'otherDeckId',
        updateDeckDto,
        'creatorId',
      );

      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        'Deck already exists: TestDeck',
      );
      expect(deckModel.findByIdAndUpdate).toHaveBeenCalledTimes(0);
    });

    it('should call update on database if succeeds', async () => {
      const updateDeckDto = createMock<UpdateDeckDto>();

      deckModel.findOne.mockResolvedValue(null);

      const responsePromise = service.update(
        'deckId',
        updateDeckDto,
        'creatorId',
      );
      await expect(responsePromise).resolves.not.toThrow();
      expect(deckModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('incrementTodayLearnedCards', () => {
    const RealDate = Date;
    let currentDate: Date;

    beforeEach(() => {
      const MockDate = jest.fn(() => new RealDate('2024-01-01T00:00:00Z'));
      global.Date = MockDate as any;

      currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
    });

    afterEach(() => {
      global.Date = RealDate;
    });

    it('should set lastTimeLearned to today if new card', async () => {
      const deck = {
        id: 'deckId',
        lastTimeLearned: null,
      } as DeckDocument;

      await service.incrementTodayLearnedCards(deck);

      expect(deckModel.findByIdAndUpdate).toHaveBeenCalledWith(
        { _id: 'deckId' },
        {
          $set: {
            lastTimeLearned: currentDate,
            numCardsLearned: 1,
          },
        },
        { new: true },
      );
    });

    it('should set lastTimeLearned to today if lastTimeLearned not today', async () => {
      const yesterday = new Date();
      yesterday.setHours(0, 0, 0, 0);
      yesterday.setDate(yesterday.getDate() - 1);

      const deck = {
        id: 'deckId',
        lastTimeLearned: yesterday,
      } as DeckDocument;

      await service.incrementTodayLearnedCards(deck);

      expect(deckModel.findByIdAndUpdate).toHaveBeenCalledWith(
        { _id: 'deckId' },
        {
          $set: {
            lastTimeLearned: currentDate,
            numCardsLearned: 1,
          },
        },
        { new: true },
      );
    });
  });

  describe('stats', () => {
    it('should execute a query on database if succeeds', async () => {
      await expect(
        service.stats('507f1f77bcf86cd799439011'),
      ).resolves.not.toThrow();
      expect(deckModel.aggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should call methods to delete deck and remove cards from deck', async () => {
      await expect(service.remove('id')).resolves.not.toThrow();
      expect(cardService.removeCardsFromDecks).toHaveBeenCalledWith(['id']);
      expect(deckModel.deleteOne).toHaveBeenCalledWith({ _id: 'id' });
    });
  });

  describe('removeDecksFromUser', () => {
    it('should remove delete decks of user and all the included cards', async () => {
      deckModel.find.mockResolvedValue([
        {
          _id: '1',
        },
        {
          _id: '2',
        },
        {
          _id: '3',
        },
      ]);

      await expect(service.removeDecksFromUser('id')).resolves.not.toThrow();
      expect(deckModel.deleteMany).toHaveBeenCalledWith({ creator: 'id' });
      expect(cardService.removeCardsFromDecks).toHaveBeenCalledWith([
        '1',
        '2',
        '3',
      ]);
    });
  });

  describe('calculateNewCardsAmount', () => {
    const RealDate = Date;
    let currentDate: Date;

    beforeEach(() => {
      const MockDate = jest.fn(() => new RealDate('2024-01-01T00:00:00Z'));
      global.Date = MockDate as any;

      currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
    });

    afterEach(() => {
      global.Date = RealDate;
    });

    it('should return smaller number of learningRate and newCardCount if deck never learned', () => {
      const deck = {
        learningRate: 10,
        lastTimeLearned: null,
        newCardCount: 5,
      } as unknown as DeckDocument & { newCardCount: number };

      expect(service.calculateNewCardsAmount(deck)).toBe(5);
    });

    it('should return smaller number of learningRate and newCardCount if lastTimeLearned not today', () => {
      const yesterday = new Date();
      yesterday.setHours(0, 0, 0, 0);
      yesterday.setDate(yesterday.getDate() - 1);

      const deck = {
        learningRate: 6,
        lastTimeLearned: yesterday,
        newCardCount: 10,
      } as unknown as DeckDocument & { newCardCount: number };

      expect(service.calculateNewCardsAmount(deck)).toBe(6);
    });

    it('should return smaller number of difference of learningRate and numCardsLearned and newCardCount if lastTime today (learningRate < newCardCount)', () => {
      const deck = {
        learningRate: 6,
        lastTimeLearned: currentDate,
        numCardsLearned: 2,
        newCardCount: 10,
      } as unknown as DeckDocument & { newCardCount: number };

      expect(service.calculateNewCardsAmount(deck)).toBe(4);
    });

    it('should return smaller number of difference of learningRate and numCardsLearned and newCardCount if lastTime today (learningRate > newCardCount)', () => {
      const deck = {
        learningRate: 10,
        lastTimeLearned: currentDate,
        numCardsLearned: 2,
        newCardCount: 5,
      } as unknown as DeckDocument & { newCardCount: number };

      expect(service.calculateNewCardsAmount(deck)).toBe(5);
    });

    it('should return smaller number of difference of learningRate and numCardsLearned and newCardCount if lastTime today (learningRate = newCardCount)', () => {
      const deck = {
        learningRate: 5,
        lastTimeLearned: currentDate,
        numCardsLearned: 3,
        newCardCount: 5,
      } as unknown as DeckDocument & { newCardCount: number };

      expect(service.calculateNewCardsAmount(deck)).toBe(2);
    });

    it('should return smaller number of difference of learningRate and numCardsLearned and newCardCount if lastTime today (numCardsLearned > learningRate)', () => {
      const deck = {
        learningRate: 5,
        lastTimeLearned: currentDate,
        numCardsLearned: 7,
        newCardCount: 5,
      } as unknown as DeckDocument & { newCardCount: number };

      expect(service.calculateNewCardsAmount(deck)).toBe(0);
    });
  });
});
